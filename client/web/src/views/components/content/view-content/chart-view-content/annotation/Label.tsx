// This component is a fork of Label component from @visx/annotaion package
// Replace this component by original when https://github.com/airbnb/visx/issues/1111 will be resolved

import { AnnotationContext } from '@visx/annotation'
import Group from '@visx/group/lib/Group'
import { useText } from '@visx/text'
import { TextProps as OriginTextProps } from '@visx/text/lib/Text'
import classNames from 'classnames'
import React, { ReactElement, useContext, useMemo } from 'react'
import useMeasure, { Options as UseMeasureOptions } from 'react-use-measure'

import { Text, TextProps } from './Text'

export interface LabelProps {
    /** Stroke color of anchor line. */
    anchorLineStroke?: string
    /** Background color of label. */
    backgroundFill?: string
    /** Padding of text from background. */
    backgroundPadding?: number | { top?: number; right?: number; bottom?: number; left?: number }
    /** Additional props to be passed to background SVGRectElement. */
    backgroundProps?: React.SVGProps<SVGRectElement>
    /** Optional className to apply to container in addition to 'visx-annotation-label'. */
    className?: string
    /** Color of title and subtitle text. */
    fontColor?: string
    /** Whether the label is horizontally anchored to the start, middle, or end of its x position. */
    horizontalAnchor?: TextProps['textAnchor']
    /** Optionally inject a ResizeObserver polyfill, else this *must* be globally available. */
    resizeObserverPolyfill?: UseMeasureOptions['polyfill']
    /** Whether to render a line indicating label text anchor. */
    showAnchorLine?: boolean
    /** Whether to render a label background. */
    showBackground?: boolean
    /** Optional subtitle. */
    subtitle?: string
    /** Optional title font size. */
    subtitleFontSize?: TextProps['fontSize']
    /** Optional title font weight. */
    subtitleFontWeight?: TextProps['fontWeight']
    /** The vertical offset of the subtitle from the title. */
    subtitleDy?: number
    /** Optional subtitle Text props (to override color, etc.). */
    subtitleProps?: Partial<TextProps>
    /** Optional title. */
    title?: string
    /** Optional title font size. */
    titleFontSize?: TextProps['fontSize']
    /** Optional title font weight. */
    titleFontWeight?: TextProps['fontWeight']
    /** Optional title Text props (to override color, etc.). */
    titleProps?: Partial<TextProps>
    /** Whether the label is vertically anchored to the start, middle, or end of its y position. */
    verticalAnchor?: TextProps['verticalAnchor']
    /** Width of annotation, including background, for text wrapping. */
    width?: number
    /** Max width of annotation, including background, for text wrapping. */
    maxWidth?: number
    /** Left offset of entire AnnotationLabel, if not specified uses x + dx from Annotation. */
    x?: number
    /** Top offset of entire AnnotationLabel, if not specified uses y + dy from Annotation. */
    y?: number
}

const DEFAULT_PADDING = { top: 12, right: 12, bottom: 12, left: 12 }

function getCompletePadding(padding: LabelProps['backgroundPadding']): typeof DEFAULT_PADDING {
    if (typeof padding === 'undefined') {
        return DEFAULT_PADDING
    }
    if (typeof padding === 'number') {
        return { top: padding, right: padding, bottom: padding, left: padding }
    }
    return { ...DEFAULT_PADDING, ...padding }
}

/** Display a label - annotation block for pie chart arc */
export function Label({
    anchorLineStroke = '#222',
    backgroundFill = '#eaeaea',
    backgroundPadding,
    backgroundProps,
    className,
    fontColor = '#222',
    horizontalAnchor: propsHorizontalAnchor,
    resizeObserverPolyfill,
    showAnchorLine = true,
    showBackground = true,
    subtitle,
    subtitleDy = 4,
    subtitleFontSize = 12,
    subtitleFontWeight = 200,
    subtitleProps,
    title,
    titleFontSize = 16,
    titleFontWeight = 600,
    titleProps,
    verticalAnchor: propsVerticalAnchor,
    width: propertyWidth,
    maxWidth = 125,
    x: propsX,
    y: propsY,
}: LabelProps): ReactElement | null {
    // we must measure the rendered title + subtitle to compute container height
    const [titleReference, titleBounds] = useMeasure({ polyfill: resizeObserverPolyfill })
    const [subtitleReference, subtitleBounds] = useMeasure({ polyfill: resizeObserverPolyfill })

    const padding = useMemo(() => getCompletePadding(backgroundPadding), [backgroundPadding])

    // if props are provided, they take precedence over context
    // eslint-disable-next-line id-length
    const { x = 0, y = 0, dx = 0, dy = 0 } = useContext(AnnotationContext)
    const height = Math.floor(padding.top + padding.bottom + (titleBounds.height ?? 0) + (subtitleBounds.height ?? 0))

    const { wordsByLines: titleWordsByLine } = useText({
        children: title,
        verticalAnchor: 'start',
        capHeight: titleFontSize,
        width: maxWidth,
        style: {
            fontSize: `${titleFontSize}px`,
            fontWeight: titleFontWeight as any,
        },
        ...(titleProps as OriginTextProps),
    })

    const { wordsByLines: subtitleWordsByLine } = useText({
        children: subtitle,
        verticalAnchor: 'start',
        capHeight: subtitleFontSize,
        width: maxWidth,
        style: {
            fontSize: `${subtitleFontSize}px`,
            fontWeight: subtitleFontWeight as any,
            // fontFamily: subtitleProps?.fontFamily,
        },
        ...(subtitleProps as OriginTextProps),
    })

    const titleMeasuredWidth = titleWordsByLine.reduce(
        (maxTitleWidth, line) => Math.max(maxTitleWidth, line.width ?? 0),
        0
    )

    const subtitleMeasuredWidth = subtitleWordsByLine.reduce(
        (maxSubtitleWidth, line) => Math.max(maxSubtitleWidth, line.width ?? 0),
        0
    )

    const textMeasuredWidth = Math.ceil(Math.min(maxWidth, Math.max(titleMeasuredWidth, subtitleMeasuredWidth)))
    const measuredWidth = padding.right + padding.left + textMeasuredWidth
    const width = propertyWidth ?? measuredWidth
    const innerWidth = width - padding.left - padding.right

    // offset container position based on horizontal + vertical anchor
    const horizontalAnchor =
        propsHorizontalAnchor || (Math.abs(dx) < Math.abs(dy) ? 'middle' : dx > 0 ? 'start' : 'end')
    const verticalAnchor = propsVerticalAnchor || (Math.abs(dx) > Math.abs(dy) ? 'middle' : dy > 0 ? 'start' : 'end')

    const containerCoords = useMemo(() => {
        let adjustedX: number = propsX === undefined ? x + dx : propsX
        let adjustedY: number = propsY === undefined ? y + dy : propsY

        if (horizontalAnchor === 'middle') {
            adjustedX -= width / 2
        }
        if (horizontalAnchor === 'end') {
            adjustedX -= width
        }
        if (verticalAnchor === 'middle') {
            adjustedY -= height / 2
        }
        if (verticalAnchor === 'end') {
            adjustedY -= height
        }

        return { x: adjustedX, y: adjustedY }
    }, [propsX, x, dx, propsY, y, dy, horizontalAnchor, verticalAnchor, width, height])

    const titleFontFamily = titleProps?.fontFamily
    const titleStyle = useMemo(
        () => ({
            fontSize: titleFontSize,
            fontWeight: titleFontWeight,
            fontFamily: titleFontFamily,
        }),
        [titleFontSize, titleFontWeight, titleFontFamily]
    ) as React.CSSProperties

    const subtitleFontFamily = subtitleProps?.fontFamily
    const subtitleStyle = useMemo(
        () => ({
            fontSize: subtitleFontSize,
            fontWeight: subtitleFontWeight,
            fontFamily: subtitleFontFamily,
        }),
        [subtitleFontSize, subtitleFontWeight, subtitleFontFamily]
    ) as React.CSSProperties

    const anchorLineOrientation = Math.abs(dx) > Math.abs(dy) ? 'vertical' : 'horizontal'

    const backgroundOutline = showAnchorLine ? { stroke: anchorLineStroke, strokeWidth: 2 } : null

    return !title && !subtitle ? null : (
        <Group
            top={containerCoords.y}
            left={containerCoords.x}
            pointerEvents="none"
            className={classNames('visx-annotationlabel', className)}
            opacity={titleBounds.height === 0 && subtitleBounds.height === 0 ? 0 : 1}
        >
            {showBackground && (
                <rect
                    className="visx-annotationlabel-background"
                    fill={backgroundFill}
                    x={0}
                    y={0}
                    width={width}
                    height={height}
                    {...backgroundProps}
                />
            )}
            {showAnchorLine && (
                <>
                    {anchorLineOrientation === 'horizontal' && verticalAnchor === 'start' && (
                        <line {...backgroundOutline} x1={0} x2={width} y1={0} y2={0} />
                    )}
                    {anchorLineOrientation === 'horizontal' && verticalAnchor === 'end' && (
                        <line {...backgroundOutline} x1={0} x2={width} y1={height} y2={height} />
                    )}
                    {anchorLineOrientation === 'vertical' && horizontalAnchor === 'start' && (
                        <line {...backgroundOutline} x1={0} x2={0} y1={0} y2={height} />
                    )}
                    {anchorLineOrientation === 'vertical' && horizontalAnchor === 'end' && (
                        <line {...backgroundOutline} x1={width} x2={width} y1={0} y2={height} />
                    )}
                </>
            )}
            {title && (
                <Text
                    innerRef={titleReference}
                    fill={fontColor}
                    verticalAnchor="start"
                    x={padding.left + (titleProps?.textAnchor === 'middle' ? innerWidth / 2 : 0)}
                    y={padding.top}
                    width={innerWidth}
                    capHeight={titleFontSize} // capHeight should match fontSize, used for first line line height
                    style={titleStyle} // used for size calculation
                    {...titleProps}
                >
                    {title}
                </Text>
            )}
            {subtitle && (
                <Text
                    innerRef={subtitleReference}
                    fill={fontColor}
                    verticalAnchor="start"
                    x={padding.left + (subtitleProps?.textAnchor === 'middle' ? innerWidth / 2 : 0)}
                    y={padding.top + (titleBounds.height ?? 0)}
                    dy={title ? subtitleDy : 0}
                    width={innerWidth}
                    capHeight={subtitleFontSize} // capHeight should match fontSize, used for first line line height
                    style={subtitleStyle} // used for size calculation
                    {...subtitleProps}
                >
                    {subtitle}
                </Text>
            )}
        </Group>
    )
}
