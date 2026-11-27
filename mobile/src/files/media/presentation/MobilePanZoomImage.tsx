import { useState, type SyntheticEvent } from 'react'
import type { PanZoomSize } from '../../../../../src/shared/document-preview/pan-zoom-view'
import { useReducedMotionEnabled } from '../../../platform/accessibility/use-reduced-motion'
import { useMobilePanZoom } from './use-mobile-pan-zoom'

type Props = {
  uri: string
  label: string
  /** The drawing's own size; raster images measure themselves on load. */
  size?: PanZoomSize | null
  /** Let fit enlarge past natural size; vectors stay sharp. */
  upscale?: boolean
  onDismiss?: () => void
  onError?: () => void
}

// DOM elements, not RN views: pointer capture and touch-action are what make pinch work in Android's WebView.
export function MobilePanZoomImage({
  uri,
  label,
  size = null,
  upscale = false,
  onDismiss,
  onError
}: Props) {
  const [loaded, setLoaded] = useState<{ uri: string; size: PanZoomSize } | null>(null)
  const content = size ?? (loaded?.uri === uri ? loaded.size : null)
  const reducedMotion = useReducedMotionEnabled()
  const panZoom = useMobilePanZoom(content, upscale, onDismiss)

  const onLoad = (event: SyntheticEvent<HTMLImageElement>): void => {
    const { naturalWidth: width, naturalHeight: height } = event.currentTarget
    if (width > 0 && height > 0) {
      setLoaded({ uri, size: { width, height } })
    }
  }

  return (
    <div ref={panZoom.setCanvas} style={CANVAS_STYLE} {...panZoom.handlers}>
      <img
        src={uri}
        alt={label}
        draggable={false}
        onLoad={onLoad}
        onError={onError}
        style={
          content && panZoom.offset
            ? {
                ...IMAGE_STYLE,
                ...(onDismiss && {
                  transform: panZoom.pull
                    ? `translate(${panZoom.pull.x}px, ${panZoom.pull.y}px)`
                    : 'none',
                  transition: panZoom.pull || reducedMotion ? 'none' : 'transform 350ms ease-out'
                }),
                left: panZoom.offset.x,
                top: panZoom.offset.y,
                width: content.width * panZoom.scale,
                height: content.height * panZoom.scale
              }
            : HIDDEN_IMAGE_STYLE
        }
      />
    </div>
  )
}

const CANVAS_STYLE = {
  position: 'relative',
  flex: 1,
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  touchAction: 'none',
  userSelect: 'none'
} as const

const IMAGE_STYLE = { position: 'absolute', maxWidth: 'none', pointerEvents: 'none' } as const

const HIDDEN_IMAGE_STYLE = { ...IMAGE_STYLE, visibility: 'hidden' } as const
