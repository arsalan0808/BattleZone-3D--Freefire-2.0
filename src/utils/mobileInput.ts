const MOBILE_MOVEMENT_ZONE_RATIO = 0.42
const MOBILE_MOVEMENT_ZONE_MIN_WIDTH = 180
const MOBILE_MOVEMENT_ZONE_MAX_WIDTH = 420

export const getMobileMovementZoneWidth = (viewportWidth: number) =>
  Math.min(
    MOBILE_MOVEMENT_ZONE_MAX_WIDTH,
    Math.max(MOBILE_MOVEMENT_ZONE_MIN_WIDTH, viewportWidth * MOBILE_MOVEMENT_ZONE_RATIO)
  )

export const isInMobileMovementZone = (clientX: number, viewportWidth: number) =>
  clientX <= getMobileMovementZoneWidth(viewportWidth)

export const isGameplayUiTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement && Boolean(target.closest('[data-ui-control="true"]'))
