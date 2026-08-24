import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { Bbox } from './types/types';
import { CoordinatesToOctants } from './coordinates-to-octants';
import { DumpObjApp, ObjWriter } from './dump-obj';
import { centerScaleObj } from './center-scale-obj';
import { OBJ_DIR } from './constants/constants';

const argv = yargs(hideBin(process.argv))
  .option('bbox', {
    type: 'string',
    demandOption: true,
    describe: 'Area to export, as --bbox=minLat,minLng,maxLat,maxLng',
  })
  .option('level', {
    type: 'number',
    default: 20,
    describe: 'Maximum octant depth. Higher means finer geometry and a slower export',
  })
  .option('center-scale', {
    type: 'boolean',
    default: false,
    describe: 'Also write the normalised model.sc.obj alongside model.obj',
  })
  .parseSync();

/**
 * Emit a machine-readable line for the calling process.
 *
 * The Blender add-on parses these to drive its progress display, which keeps it
 * from having to guess the output directory by comparing file timestamps.
 */
function emit(event: string, data: Record<string, unknown> = {}): void {
  console.log(`GMEB::${event} ${JSON.stringify(data)}`);
}

function parseBBox(bboxStr: string): { bbox: Bbox } {
  const parts = bboxStr.trim().replace(/['"]/g, '').split(',').map((s) => Number(s.trim()));

  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
    throw new Error(
      `Wrong --bbox format: "${bboxStr}". Use --bbox=minLat,minLng,maxLat,maxLng`,
    );
  }

  // Note: a plain falsy check would reject a perfectly valid 0 here, which is
  // why every bound is range-checked instead.
  const [minLat, minLng, maxLat, maxLng] = parts;

  for (const [name, v, limit] of [
    ['minLat', minLat, 90],
    ['maxLat', maxLat, 90],
    ['minLng', minLng, 180],
    ['maxLng', maxLng, 180],
  ] as [string, number, number][]) {
    if (v < -limit || v > limit) {
      throw new Error(`${name} out of range: ${v} (expected -${limit}..${limit})`);
    }
  }

  if (maxLat <= minLat || maxLng <= minLng) {
    throw new Error(
      `Empty bbox: max must exceed min (got lat ${minLat}..${maxLat}, lng ${minLng}..${maxLng})`,
    );
  }

  return {
    bbox: [
      { longitude: maxLng, latitude: maxLat },
      { longitude: minLng, latitude: minLat },
    ],
  };
}

async function bootstrap() {
  const { bbox } = parseBBox(argv.bbox);
  const maxLevel = Math.max(2, Math.min(21, Math.round(argv.level)));

  emit('start', { bbox: argv.bbox, level: maxLevel });

  const app = new DumpObjApp();

  const data = await CoordinatesToOctants.convertBbox(bbox, maxLevel);

  // Take the deepest level found plus its parent, matching the original
  // behaviour at level 20. Overlap between the two is handled downstream: each
  // node is written with an exclude list covering the sub-octants that were
  // themselves downloaded, so children replace their parents' triangles.
  const levels = Object.keys(data)
    .map(Number)
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => b - a);

  if (levels.length === 0) {
    throw new Error(
      'No octants found for that area. Google Earth may not have 3D coverage there.',
    );
  }

  // The deepest two levels are collected, but a shallower octant's traversal
  // already recurses down through its own descendants. Searching both lists
  // therefore visited - and wrote - every deep node twice, putting two exactly
  // coincident copies of each mesh in the model. They z-fight, which reads as
  // solid dark blocks rather than as duplicated geometry.
  //
  // So any octant that has an ancestor in the set is dropped: searching the
  // ancestor covers it, and covers it once.
  const collected = new Set<string>();
  for (const level of levels.slice(0, 2)) {
    for (const oct of data[level].octants) {
      collected.add(oct);
    }
  }

  const octants = [...collected].filter(
    (oct) => ![...collected].some((other) => other !== oct && oct.startsWith(other)),
  );

  emit('octants', {
    count: octants.length,
    levels: levels.slice(0, 2),
    dropped: collected.size - octants.length,
  });

  const modelOutDir = await app.run(octants, maxLevel);
  if (!modelOutDir) {
    throw new Error('Model out dir is undefined');
  }

  if (argv['center-scale']) {
    centerScaleObj(OBJ_DIR);
  }

  // Tell the caller if any tile arrived in a format we cannot decode, so a
  // model with untextured patches explains itself instead of looking broken.
  if (ObjWriter.texturesFailed > 0) {
    emit('textures', { failed: ObjWriter.texturesFailed });
  }

  emit('done', { dir: modelOutDir });
}

bootstrap().catch((err) => {
  emit('error', { message: err instanceof Error ? err.message : String(err) });
  console.error(err);
  process.exit(1);
});
