/**
 * What leaflet-rotate adds to Leaflet's map. The package ships no types, and
 * these are the parts this interface uses.
 */
import "leaflet";

declare module "leaflet" {
  interface MapOptions {
    rotate?: boolean;
    /** Starting rotation in degrees, clockwise. */
    bearing?: number;
    rotateControl?: boolean | Record<string, unknown>;
    touchRotate?: boolean;
    /** Shift + vertical mouse wheel turns the map in 5 degree steps. */
    shiftKeyRotate?: boolean;
    /** Follow the device's compass. */
    compassBearing?: boolean;
  }

  interface Map {
    /** Rotate to `degrees`, clockwise. Fires "rotate". */
    setBearing(degrees: number): void;
    /** The rotation in degrees, clockwise, from 0 up to 360. */
    getBearing(): number;
  }
}
