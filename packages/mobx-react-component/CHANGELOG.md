# mobx-react-component changelog

## v1.1.0

-   Improved support for strict and concurrent mode.

## v1.0.1

-   Fix some typings.

## v1.0.0

-   Update some dev dependencies, up version to 1.0.0

## v0.52.0

-   Added a `refEmulation` option to `@mobxComponent` to be able to turn ref emulation via forwardRef off.

## v0.51.0

-   Fixed SSR warnings about useLayoutEffect
-   Fixed props typings of `MobxComponent` not including children by default like class components usually do
-   Added `runBeforeMount` option to `useMobxEffects`
-   Added `useMobxStatingRendering` and `isUsingMobxStaticRendering`

## v0.50.4

-   Some fixes to properly show the component name in the timings section of the performance reports in Chrome for `mobxComponent()` decorated classes
-   Added `displayName` option to the option settings of `mobxObserver`
