import { emit, on, showUI } from '@create-figma-plugin/utilities'

import {
  CloseHandler,
  ExportSourceMode,
  GetTargetNodeStatusHandler,
  PushSelectionToActiveFileHandler,
  GetUiPrefsHandler,
  ResizeUiWindowHandler,
  RenderUiSpecHandler,
  RenderMode,
  SetUiPrefsHandler,
  UiPrefs,
  TargetNodeStatusHandler,
  UseSelectedNodeAsTargetHandler,
  UiPrefsHandler,
  UiStatusHandler
} from './types'

type UiNodeType =
  | 'FRAME'
  | 'GROUP'
  | 'SECTION'
  | 'COMPONENT'
  | 'RECTANGLE'
  | 'TEXT'
  | 'ELLIPSE'
  | 'LINE'
  | 'POLYGON'
  | 'STAR'
  | 'SVG'
  | 'ICON'

type HexColor = `#${string}`
type ImageScale = 'FILL' | 'FIT' | 'CROP' | 'TILE'

type BlendModeSpec =
  | 'PASS_THROUGH'
  | 'NORMAL'
  | 'DARKEN'
  | 'MULTIPLY'
  | 'LINEAR_BURN'
  | 'COLOR_BURN'
  | 'LIGHTEN'
  | 'SCREEN'
  | 'LINEAR_DODGE'
  | 'COLOR_DODGE'
  | 'OVERLAY'
  | 'SOFT_LIGHT'
  | 'HARD_LIGHT'
  | 'DIFFERENCE'
  | 'EXCLUSION'
  | 'HUE'
  | 'SATURATION'
  | 'COLOR'
  | 'LUMINOSITY'

type ConstraintSpec = {
  horizontal?: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'SCALE'
  vertical?: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'SCALE'
}

let instanceRestoreDebugLogs: Array<string> = []

function pushInstanceRestoreDebug(message: string): void {
  instanceRestoreDebugLogs.push(message)
  console.log(`[instance-restore] ${message}`)
}

interface SolidFillSpec {
  type: 'SOLID'
  color: HexColor
  opacity?: number
}

interface GradientStopSpec {
  color: HexColor
  position: number
}

interface GradientFillSpec {
  type: 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR' | 'GRADIENT_DIAMOND'
  stops: Array<GradientStopSpec>
  transform?: [[number, number, number], [number, number, number]]
  opacity?: number
}

interface ImageFillSpec {
  type: 'IMAGE'
  url: string
  scaleMode?: ImageScale
  opacity?: number
}

type FillSpec = HexColor | SolidFillSpec | GradientFillSpec | ImageFillSpec

interface StrokeSpec {
  color: HexColor
  weight?: number
  opacity?: number
  align?: 'CENTER' | 'INSIDE' | 'OUTSIDE'
  dashes?: Array<number>
}

interface ShadowEffectSpec {
  type: 'DROP_SHADOW' | 'INNER_SHADOW'
  color?: HexColor
  opacity?: number
  x?: number
  y?: number
  blur?: number
  spread?: number
}

interface BlurEffectSpec {
  type: 'LAYER_BLUR' | 'BACKGROUND_BLUR'
  radius?: number
}

type EffectSpec = ShadowEffectSpec | BlurEffectSpec

interface BaseSpecNode {
  type: UiNodeType
  name?: string
  x?: number
  y?: number
  width?: number
  height?: number
  rotation?: number
  opacity?: number
  visible?: boolean
  locked?: boolean
  blendMode?: BlendModeSpec
  cornerRadius?: number
  cornerRadii?: [number, number, number, number]
  fills?: Array<FillSpec>
  strokes?: Array<StrokeSpec>
  effects?: Array<EffectSpec>
  constraints?: ConstraintSpec
  layoutAlign?: 'INHERIT' | 'STRETCH' | 'MIN' | 'CENTER' | 'MAX'
  layoutGrow?: number
  layoutPositioning?: 'AUTO' | 'ABSOLUTE'
  autoGroupChildren?: boolean
  autoGroupName?: string
  meta?: {
    roundTripVersion: '1.0'
    figmaNodeId: string
    figmaNodeType: string
    sourceSemanticId?: string
    warnings?: Array<string>
    instanceOf?: {
      componentId: string
      componentName: string
      componentDescription?: string
      componentDescriptionMarkdown?: string
      componentSetId?: string
      componentSetName?: string
      componentSetDescription?: string
      componentSetDescriptionMarkdown?: string
      variantProperties?: Record<string, string>
      availableVariants?: Array<{
        componentId: string
        componentName: string
        componentDescription?: string
        componentDescriptionMarkdown?: string
        variantProperties?: Record<string, string>
      }>
    }
  }
  semantic?: unknown
  children?: Array<SpecNode>
}

interface FrameLikeSpecNode extends BaseSpecNode {
  layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL'
  itemSpacing?: number
  paddingTop?: number
  paddingRight?: number
  paddingBottom?: number
  paddingLeft?: number
  primaryAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN'
  counterAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'BASELINE'
  clipsContent?: boolean
}

interface FrameSpecNode extends FrameLikeSpecNode {
  type: 'FRAME'
}

interface SectionSpecNode extends FrameLikeSpecNode {
  type: 'SECTION'
}

interface ComponentSpecNode extends FrameLikeSpecNode {
  type: 'COMPONENT'
}

interface GroupSpecNode extends BaseSpecNode {
  type: 'GROUP'
  children: Array<SpecNode>
}

interface TextSpecNode extends BaseSpecNode {
  type: 'TEXT'
  text: string
  fontFamily?: string
  fontStyle?: string
  fontSize?: number
  fontWeight?: 'regular' | 'bold'
  lineHeightPx?: number
  letterSpacingPx?: number
  textCase?:
    | 'ORIGINAL'
    | 'UPPER'
    | 'LOWER'
    | 'TITLE'
    | 'SMALL_CAPS'
    | 'SMALL_CAPS_FORCED'
  textDecoration?: 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH'
  textAlignHorizontal?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED'
  textAlignVertical?: 'TOP' | 'CENTER' | 'BOTTOM'
  textAutoResize?: 'NONE' | 'WIDTH_AND_HEIGHT' | 'HEIGHT' | 'TRUNCATE'
}

interface RectangleSpecNode extends BaseSpecNode {
  type: 'RECTANGLE'
}

interface EllipseSpecNode extends BaseSpecNode {
  type: 'ELLIPSE'
  arcData?: {
    startingAngle: number
    endingAngle: number
    innerRadius?: number
  }
}

interface LineSpecNode extends BaseSpecNode {
  type: 'LINE'
}

interface PolygonSpecNode extends BaseSpecNode {
  type: 'POLYGON'
  pointCount?: number
}

interface StarSpecNode extends BaseSpecNode {
  type: 'STAR'
  pointCount?: number
  innerRadius?: number
}

interface SvgSpecNode extends BaseSpecNode {
  type: 'SVG'
  svg?: string
  svgUrl?: string
}

interface IconSpecNode extends BaseSpecNode {
  type: 'ICON'
  svg?: string
  svgUrl?: string
  color?: HexColor
}

type SpecNode =
  | FrameSpecNode
  | SectionSpecNode
  | ComponentSpecNode
  | GroupSpecNode
  | TextSpecNode
  | RectangleSpecNode
  | EllipseSpecNode
  | LineSpecNode
  | PolygonSpecNode
  | StarSpecNode
  | SvgSpecNode
  | IconSpecNode

const imageHashCache = new Map<string, string>()
const textResponseCache = new Map<string, string>()
const UI_PREFS_STORAGE_KEY = 'ui-spec-renderer.ui-prefs'
const RENDER_ROOT_PLUGIN_DATA_KEY = 'ui-spec-renderer-root'
const RENDER_SESSION_PLUGIN_DATA_KEY = 'ui-spec-renderer-session'
const RENDER_SOURCE_FILE_KEY = 'ui-spec-source-file'
const RENDER_SEMANTIC_ID_KEY = 'ui-spec-semantic-id'
const DEFAULT_UI_WIDTH = 480
const DEFAULT_UI_HEIGHT = 640
const MIN_UI_WIDTH = 360
const MIN_UI_HEIGHT = 480
const DEFAULT_UI_PREFS: UiPrefs = {
  syncUrl: 'http://127.0.0.1:4311',
  uiWidth: DEFAULT_UI_WIDTH,
  uiHeight: DEFAULT_UI_HEIGHT
}

const SUPPORTED_EXPORT_TYPES = new Set<SceneNode['type']>([
  'FRAME',
  'GROUP',
  'SECTION',
  'COMPONENT',
  'TEXT',
  'RECTANGLE',
  'ELLIPSE',
  'LINE',
  'POLYGON',
  'STAR',
  'VECTOR',
  'BOOLEAN_OPERATION',
  'INSTANCE'
])

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function normalizeHex(hex: string): string {
  return hex.replace('#', '')
}

function byteToHex(value: number): string {
  return Math.round(clamp(value, 0, 1) * 255)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase()
}

function rgbaToHex(color: RGB | RGBA, opacity?: number): HexColor {
  const alpha = typeof opacity === 'number' ? clamp(opacity, 0, 1) : 'a' in color ? clamp(color.a, 0, 1) : 1
  const base = `#${byteToHex(color.r)}${byteToHex(color.g)}${byteToHex(color.b)}`
  if (alpha >= 0.999) {
    return base as HexColor
  }
  return `${base}${byteToHex(alpha)}` as HexColor
}

function decodeUtf8(bytes: Uint8Array): string {
  let result = ''
  for (let index = 0; index < bytes.length; index += 1) {
    const byte1 = bytes[index]
    if (byte1 < 0x80) {
      result += String.fromCharCode(byte1)
      continue
    }

    if ((byte1 & 0xe0) === 0xc0 && index + 1 < bytes.length) {
      const byte2 = bytes[index + 1]
      const codePoint = ((byte1 & 0x1f) << 6) | (byte2 & 0x3f)
      result += String.fromCharCode(codePoint)
      index += 1
      continue
    }

    if ((byte1 & 0xf0) === 0xe0 && index + 2 < bytes.length) {
      const byte2 = bytes[index + 1]
      const byte3 = bytes[index + 2]
      const codePoint = ((byte1 & 0x0f) << 12) | ((byte2 & 0x3f) << 6) | (byte3 & 0x3f)
      result += String.fromCharCode(codePoint)
      index += 2
      continue
    }

    if ((byte1 & 0xf8) === 0xf0 && index + 3 < bytes.length) {
      const byte2 = bytes[index + 1]
      const byte3 = bytes[index + 2]
      const byte4 = bytes[index + 3]
      const codePoint =
        ((byte1 & 0x07) << 18) |
        ((byte2 & 0x3f) << 12) |
        ((byte3 & 0x3f) << 6) |
        (byte4 & 0x3f)
      const adjusted = codePoint - 0x10000
      result += String.fromCharCode(
        0xd800 + ((adjusted >> 10) & 0x3ff),
        0xdc00 + (adjusted & 0x3ff)
      )
      index += 3
      continue
    }

    result += '\uFFFD'
  }
  return result
}

function hexToRgba(hex: string): RGBA {
  const normalized = normalizeHex(hex)
  if (normalized.length === 3) {
    const expanded = normalized
      .split('')
      .map((char) => `${char}${char}`)
      .join('')
    const int = Number.parseInt(expanded, 16)
    if (Number.isNaN(int)) {
      throw new Error(`Invalid color: ${hex}`)
    }
    return {
      r: ((int >> 16) & 255) / 255,
      g: ((int >> 8) & 255) / 255,
      b: (int & 255) / 255,
      a: 1
    }
  }

  if (normalized.length === 6 || normalized.length === 8) {
    const int = Number.parseInt(normalized.slice(0, 6), 16)
    const alpha = normalized.length === 8 ? Number.parseInt(normalized.slice(6, 8), 16) / 255 : 1
    if (Number.isNaN(int) || Number.isNaN(alpha)) {
      throw new Error(`Invalid color: ${hex}`)
    }
    return {
      r: ((int >> 16) & 255) / 255,
      g: ((int >> 8) & 255) / 255,
      b: (int & 255) / 255,
      a: clamp(alpha, 0, 1)
    }
  }

  throw new Error(`Invalid color: ${hex}`)
}

async function fetchText(url: string): Promise<string> {
  const cached = textResponseCache.get(url)
  if (typeof cached === 'string') {
    return cached
  }
  const response = await fetch(url)
  if (response.ok === false) {
    throw new Error(`텍스트 다운로드 실패 (${response.status}): ${url}`)
  }
  const text = await response.text()
  textResponseCache.set(url, text)
  return text
}

async function fetchImageHash(url: string): Promise<string> {
  const cached = imageHashCache.get(url)
  if (typeof cached === 'string') {
    return cached
  }
  const response = await fetch(url)
  if (response.ok === false) {
    throw new Error(`이미지 다운로드 실패 (${response.status}): ${url}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  const image = figma.createImage(new Uint8Array(arrayBuffer))
  imageHashCache.set(url, image.hash)
  return image.hash
}

async function mapPaint(fill: FillSpec): Promise<Paint> {
  if (typeof fill === 'string') {
    const rgba = hexToRgba(fill)
    return {
      type: 'SOLID',
      color: { r: rgba.r, g: rgba.g, b: rgba.b },
      opacity: rgba.a
    }
  }

  if (fill.type === 'SOLID') {
    const rgba = hexToRgba(fill.color)
    return {
      type: 'SOLID',
      color: { r: rgba.r, g: rgba.g, b: rgba.b },
      opacity: typeof fill.opacity === 'number' ? clamp(fill.opacity, 0, 1) : rgba.a
    }
  }

  if (fill.type === 'IMAGE') {
    const imageHash = await fetchImageHash(fill.url)
    return {
      type: 'IMAGE',
      imageHash,
      scaleMode: fill.scaleMode ?? 'FILL',
      opacity: typeof fill.opacity === 'number' ? clamp(fill.opacity, 0, 1) : 1
    }
  }

  const stops: Array<ColorStop> = fill.stops.map(function (stop) {
    const rgba = hexToRgba(stop.color)
    return {
      position: clamp(stop.position, 0, 1),
      color: {
        r: rgba.r,
        g: rgba.g,
        b: rgba.b,
        a: rgba.a
      }
    }
  })

  return {
    type: fill.type,
    gradientStops: stops,
    gradientTransform: fill.transform ?? [
      [1, 0, 0],
      [0, 1, 0]
    ],
    opacity: typeof fill.opacity === 'number' ? clamp(fill.opacity, 0, 1) : 1
  }
}

async function mapPaints(fills: Array<FillSpec> | undefined): Promise<ReadonlyArray<Paint>> {
  if (Array.isArray(fills) === false || fills.length === 0) {
    return []
  }
  const mapped: Array<Paint> = []
  for (const fill of fills) {
    mapped.push(await mapPaint(fill))
  }
  return mapped
}

function mapStrokes(strokes: Array<StrokeSpec> | undefined): {
  paints: ReadonlyArray<Paint>
  weight: number
  align: 'CENTER' | 'INSIDE' | 'OUTSIDE'
  dashes: Array<number>
} | null {
  if (Array.isArray(strokes) === false || strokes.length === 0) {
    return null
  }

  const paints = strokes.map(function (stroke): SolidPaint {
    const rgba = hexToRgba(stroke.color)
    return {
      type: 'SOLID',
      color: { r: rgba.r, g: rgba.g, b: rgba.b },
      opacity: typeof stroke.opacity === 'number' ? clamp(stroke.opacity, 0, 1) : rgba.a
    }
  })

  return {
    paints,
    weight: typeof strokes[0]?.weight === 'number' ? clamp(strokes[0].weight as number, 0, 128) : 1,
    align: strokes[0]?.align ?? 'INSIDE',
    dashes: Array.isArray(strokes[0]?.dashes) ? strokes[0].dashes : []
  }
}

function mapEffects(effects: Array<EffectSpec> | undefined): ReadonlyArray<Effect> {
  if (Array.isArray(effects) === false || effects.length === 0) {
    return []
  }

  const mapped: Array<Effect> = []
  for (const effect of effects) {
    if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
      const rgba = hexToRgba(effect.color ?? '#11131833')
      mapped.push({
        type: effect.type,
        color: {
          r: rgba.r,
          g: rgba.g,
          b: rgba.b,
          a: typeof effect.opacity === 'number' ? clamp(effect.opacity, 0, 1) : rgba.a
        },
        offset: {
          x: typeof effect.x === 'number' ? effect.x : 0,
          y: typeof effect.y === 'number' ? effect.y : 8
        },
        radius: typeof effect.blur === 'number' ? clamp(effect.blur, 0, 100) : 24,
        spread: typeof effect.spread === 'number' ? clamp(effect.spread, -100, 100) : 0,
        visible: true,
        blendMode: 'NORMAL'
      })
      continue
    }

    if (effect.type === 'LAYER_BLUR' || effect.type === 'BACKGROUND_BLUR') {
      mapped.push({
        type: effect.type,
        radius: typeof effect.radius === 'number' ? clamp(effect.radius, 0, 100) : 8,
        visible: true
      })
    }
  }

  return mapped
}

function applyCornerRadius(node: SceneNode, spec: BaseSpecNode): void {
  if ('cornerRadius' in node && typeof spec.cornerRadius === 'number') {
    ;(node as GeometryMixin & CornerMixin).cornerRadius = clamp(spec.cornerRadius, 0, 1000)
  }

  if (
    Array.isArray(spec.cornerRadii) &&
    spec.cornerRadii.length === 4 &&
    'topLeftRadius' in (node as any)
  ) {
    const cast = node as RectangleCornerMixin
    cast.topLeftRadius = clamp(spec.cornerRadii[0], 0, 1000)
    cast.topRightRadius = clamp(spec.cornerRadii[1], 0, 1000)
    cast.bottomRightRadius = clamp(spec.cornerRadii[2], 0, 1000)
    cast.bottomLeftRadius = clamp(spec.cornerRadii[3], 0, 1000)
  }
}

function applyAutoLayoutChildOptions(node: SceneNode, spec: BaseSpecNode): void {
  const mixin = node as LayoutMixin
  if (typeof spec.layoutAlign === 'string' && 'layoutAlign' in mixin) {
    mixin.layoutAlign = spec.layoutAlign
  }
  if (typeof spec.layoutGrow === 'number' && 'layoutGrow' in mixin) {
    mixin.layoutGrow = clamp(spec.layoutGrow, 0, 1)
  }
  if (typeof spec.layoutPositioning === 'string' && 'layoutPositioning' in mixin) {
    mixin.layoutPositioning = spec.layoutPositioning
  }
}

function resolveUniqueNameInCurrentPage(baseName: string, nodeIdToIgnore: string): string {
  const trimmed = baseName.trim()
  if (trimmed === '') {
    return baseName
  }

  const usedNames = new Set<string>()
  const allNodes = figma.currentPage.findAll()
  for (const node of allNodes) {
    if (node.id === nodeIdToIgnore) {
      continue
    }
    usedNames.add(node.name)
  }

  if (usedNames.has(trimmed) === false) {
    return trimmed
  }

  let maxSuffix = 0
  const suffixPattern = new RegExp(`^${trimmed.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')} #(\\d+)$`)
  usedNames.forEach(function (usedName) {
    const match = usedName.match(suffixPattern)
    if (match !== null) {
      const parsed = Number(match[1])
      if (Number.isFinite(parsed) && parsed > maxSuffix) {
        maxSuffix = parsed
      }
    }
  })
  return `${trimmed} #${maxSuffix + 1}`
}

async function applyBase(node: SceneNode, spec: BaseSpecNode): Promise<void> {
  if (typeof spec.name === 'string' && spec.name !== '') {
    node.name = resolveUniqueNameInCurrentPage(spec.name, node.id)
  }
  if (typeof spec.visible === 'boolean') {
    node.visible = spec.visible
  }
  if (typeof spec.locked === 'boolean') {
    node.locked = spec.locked
  }
  if (typeof spec.opacity === 'number' && 'opacity' in node) {
    node.opacity = clamp(spec.opacity, 0, 1)
  }
  if (typeof spec.blendMode === 'string') {
    ;(node as BlendMixin).blendMode = spec.blendMode
  }
  if (typeof spec.rotation === 'number' && 'rotation' in node) {
    node.rotation = spec.rotation
  }
  if (typeof spec.x === 'number') {
    node.x = spec.x
  }
  if (typeof spec.y === 'number') {
    node.y = spec.y
  }

  if ('resize' in node && typeof spec.width === 'number' && typeof spec.height === 'number') {
    node.resize(clamp(spec.width, 1, 10000), clamp(spec.height, 1, 10000))
  }

  applyCornerRadius(node, spec)

  if (typeof spec.constraints === 'object' && spec.constraints !== null && 'constraints' in node) {
    ;(node as ConstraintMixin).constraints = {
      horizontal: spec.constraints.horizontal ?? 'MIN',
      vertical: spec.constraints.vertical ?? 'MIN'
    }
  }

  applyAutoLayoutChildOptions(node, spec)

  if ('fills' in node) {
    const fills = await mapPaints(spec.fills)
    if (Array.isArray(spec.fills)) {
      ;(node as GeometryMixin).fills = fills
    } else if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'SECTION') {
      // Figma frame-like nodes start with a default white fill.
      // When ui_spec omits fills, keep the source-of-truth behavior as transparent.
      ;(node as GeometryMixin).fills = []
    } else if (fills.length > 0) {
      ;(node as GeometryMixin).fills = fills
    }
  }

  if ('strokes' in node) {
    const stroke = mapStrokes(spec.strokes)
    if (stroke !== null) {
      const cast = node as GeometryMixin
      cast.strokes = stroke.paints
      cast.strokeWeight = stroke.weight
      cast.strokeAlign = stroke.align
      if ('dashPattern' in cast) {
        ;(cast as any).dashPattern = stroke.dashes
      }
    }
  }

  if ('effects' in node) {
    const effects = mapEffects(spec.effects)
    if (effects.length > 0) {
      ;(node as BlendMixin).effects = effects
    }
  }
}

function applyFrameLikeLayout(node: FrameNode | SectionNode | ComponentNode, spec: FrameLikeSpecNode): void {
  if (
    'layoutMode' in node &&
    (spec.layoutMode === 'HORIZONTAL' || spec.layoutMode === 'VERTICAL' || spec.layoutMode === 'NONE')
  ) {
    node.layoutMode = spec.layoutMode
  }
  if ('itemSpacing' in node && typeof spec.itemSpacing === 'number') {
    node.itemSpacing = spec.itemSpacing
  }
  if ('paddingTop' in node && typeof spec.paddingTop === 'number') {
    node.paddingTop = spec.paddingTop
  }
  if ('paddingRight' in node && typeof spec.paddingRight === 'number') {
    node.paddingRight = spec.paddingRight
  }
  if ('paddingBottom' in node && typeof spec.paddingBottom === 'number') {
    node.paddingBottom = spec.paddingBottom
  }
  if ('paddingLeft' in node && typeof spec.paddingLeft === 'number') {
    node.paddingLeft = spec.paddingLeft
  }
  if ('primaryAxisAlignItems' in node && typeof spec.primaryAxisAlignItems === 'string') {
    node.primaryAxisAlignItems = spec.primaryAxisAlignItems
  }
  if ('counterAxisAlignItems' in node && typeof spec.counterAxisAlignItems === 'string') {
    node.counterAxisAlignItems = spec.counterAxisAlignItems
  }
  if ('clipsContent' in node && typeof spec.clipsContent === 'boolean') {
    node.clipsContent = spec.clipsContent
  }
}

function recolorIconGeometry(iconRoot: FrameNode, color: HexColor): void {
  const rgba = hexToRgba(color)
  const targetPaint: SolidPaint = {
    type: 'SOLID',
    color: { r: rgba.r, g: rgba.g, b: rgba.b },
    opacity: rgba.a
  }

  const geometryNodes = iconRoot.findAll(function (node) {
    return 'fills' in node
  })

  for (const node of geometryNodes) {
    ;(node as GeometryMixin).fills = [targetPaint]
  }
}

async function createSvgNode(spec: SvgSpecNode | IconSpecNode): Promise<FrameNode> {
  let svgString = ''
  if (typeof spec.svg === 'string' && spec.svg.trim() !== '') {
    svgString = spec.svg
  } else if (typeof spec.svgUrl === 'string' && spec.svgUrl.trim() !== '') {
    svgString = await fetchText(spec.svgUrl)
  } else {
    throw new Error(`${spec.type}는 svg 또는 svgUrl이 필요합니다.`)
  }

  const node = figma.createNodeFromSvg(svgString)
  node.setPluginData('svgRoot', 'true')
  if (spec.type === 'ICON' && typeof spec.color === 'string') {
    recolorIconGeometry(node, spec.color)
  }
  return node
}

async function createTextNode(spec: TextSpecNode): Promise<TextNode> {
  const fontFamily = spec.fontFamily ?? 'Inter'
  const fontStyle = spec.fontStyle ?? (spec.fontWeight === 'bold' ? 'Bold' : 'Regular')

  try {
    await figma.loadFontAsync({ family: fontFamily, style: fontStyle })
  } catch (_error) {
    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' })
  }

  const text = figma.createText()
  text.fontName = {
    family: fontFamily,
    style: fontStyle
  }
  text.characters = spec.text

  if (typeof spec.fontSize === 'number') {
    text.fontSize = clamp(spec.fontSize, 1, 320)
  }
  if (typeof spec.lineHeightPx === 'number') {
    text.lineHeight = {
      unit: 'PIXELS',
      value: clamp(spec.lineHeightPx, 1, 600)
    }
  }
  if (typeof spec.letterSpacingPx === 'number') {
    text.letterSpacing = {
      unit: 'PIXELS',
      value: clamp(spec.letterSpacingPx, -40, 200)
    }
  }
  if (typeof spec.textCase === 'string') {
    text.textCase = spec.textCase
  }
  if (typeof spec.textDecoration === 'string') {
    text.textDecoration = spec.textDecoration
  }
  if (typeof spec.textAlignHorizontal === 'string') {
    text.textAlignHorizontal = spec.textAlignHorizontal
  }
  if (typeof spec.textAlignVertical === 'string') {
    text.textAlignVertical = spec.textAlignVertical
  }
  if (typeof spec.textAutoResize === 'string') {
    text.textAutoResize = spec.textAutoResize
  }

  return text
}

async function instantiateNonGroupNode(spec: Exclude<SpecNode, GroupSpecNode>): Promise<SceneNode> {
  if (spec.type === 'FRAME') {
    const node = figma.createFrame()
    applyFrameLikeLayout(node, spec)
    return node
  }
  if (spec.type === 'SECTION') {
    const node = figma.createSection()
    applyFrameLikeLayout(node, spec)
    return node
  }
  if (spec.type === 'COMPONENT') {
    const node = figma.createComponent()
    applyFrameLikeLayout(node, spec)
    return node
  }
  if (spec.type === 'TEXT') {
    return createTextNode(spec)
  }
  if (spec.type === 'RECTANGLE') {
    return figma.createRectangle()
  }
  if (spec.type === 'ELLIPSE') {
    const node = figma.createEllipse()
    if (typeof spec.arcData === 'object' && spec.arcData !== null) {
      node.arcData = {
        startingAngle: spec.arcData.startingAngle,
        endingAngle: spec.arcData.endingAngle,
        innerRadius: typeof spec.arcData.innerRadius === 'number' ? clamp(spec.arcData.innerRadius, 0, 1) : 0
      }
    }
    return node
  }
  if (spec.type === 'LINE') {
    return figma.createLine()
  }
  if (spec.type === 'POLYGON') {
    const node = figma.createPolygon()
    if (typeof spec.pointCount === 'number') {
      node.pointCount = clamp(spec.pointCount, 3, 60)
    }
    return node
  }
  if (spec.type === 'STAR') {
    const node = figma.createStar()
    if (typeof spec.pointCount === 'number') {
      node.pointCount = clamp(spec.pointCount, 3, 60)
    }
    if (typeof spec.innerRadius === 'number') {
      node.innerRadius = clamp(spec.innerRadius, 0, 1)
    }
    return node
  }

  return createSvgNode(spec)
}

function equalVariantProperties(
  left: Record<string, string> | undefined,
  right: Record<string, string> | undefined
): boolean {
  const leftKeys = Object.keys(left ?? {}).sort()
  const rightKeys = Object.keys(right ?? {}).sort()
  if (leftKeys.length !== rightKeys.length) {
    return false
  }
  for (let index = 0; index < leftKeys.length; index += 1) {
    const key = leftKeys[index]
    if (key !== rightKeys[index]) {
      return false
    }
    if ((left ?? {})[key] !== (right ?? {})[key]) {
      return false
    }
  }
  return true
}

async function getNodeByIdIfExists(id: string | undefined): Promise<BaseNode | null> {
  if (typeof id !== 'string' || id.trim() === '') {
    return null
  }
  try {
    return await figma.getNodeByIdAsync(id)
  } catch (_error) {
    return null
  }
}

async function resolveComponentForInstanceMeta(
  spec: Exclude<SpecNode, GroupSpecNode>
): Promise<ComponentNode | null> {
  const instanceMeta = spec.meta?.instanceOf
  if (!instanceMeta) {
    return null
  }

  const specName = typeof spec.name === 'string' && spec.name.trim() !== '' ? spec.name.trim() : '(unnamed spec node)'

  const directComponent = await getNodeByIdIfExists(instanceMeta.componentId)
  if (directComponent !== null && directComponent.type === 'COMPONENT') {
    pushInstanceRestoreDebug(`${specName}: restored by componentId ${instanceMeta.componentId}`)
    return directComponent
  }

  const componentSetNode = await getNodeByIdIfExists(instanceMeta.componentSetId)
  if (componentSetNode !== null && componentSetNode.type === 'COMPONENT_SET') {
    const preferred = componentSetNode.children.find(function (child): child is ComponentNode {
      if (child.type !== 'COMPONENT') {
        return false
      }
      const childVariantProps = (child as unknown as { variantProperties?: Record<string, string> }).variantProperties
      if (equalVariantProperties(childVariantProps, instanceMeta.variantProperties)) {
        return true
      }
      return child.name === instanceMeta.componentName
    })
    if (preferred) {
      pushInstanceRestoreDebug(
        `${specName}: restored from componentSetId ${instanceMeta.componentSetId} with variant match`
      )
      return preferred
    }
  }

  const allNodes = figma.root.findAll()
  const sameNamedComponent = allNodes.find(function (node): node is ComponentNode {
    return node.type === 'COMPONENT' && node.name === instanceMeta.componentName
  })
  if (sameNamedComponent) {
    pushInstanceRestoreDebug(`${specName}: restored by componentName "${instanceMeta.componentName}"`)
    return sameNamedComponent
  }

  if (typeof instanceMeta.componentSetName === 'string' && instanceMeta.componentSetName.trim() !== '') {
    const sameNamedSet = allNodes.find(function (node): node is ComponentSetNode {
      return node.type === 'COMPONENT_SET' && node.name === instanceMeta.componentSetName
    })
    if (sameNamedSet) {
      const matchingVariant = sameNamedSet.children.find(function (child): child is ComponentNode {
        if (child.type !== 'COMPONENT') {
          return false
        }
        const childVariantProps = (child as unknown as { variantProperties?: Record<string, string> }).variantProperties
        return equalVariantProperties(childVariantProps, instanceMeta.variantProperties)
      })
      if (matchingVariant) {
        pushInstanceRestoreDebug(
          `${specName}: restored by componentSetName "${instanceMeta.componentSetName}" with variant match`
        )
        return matchingVariant
      }
    }
  }

  pushInstanceRestoreDebug(
    `${specName}: instance restore fallback to snapshot; no matching component/variant found`
  )
  return null
}

async function instantiateFromInstanceMeta(spec: Exclude<SpecNode, GroupSpecNode>): Promise<InstanceNode | null> {
  if (spec.type !== 'FRAME') {
    return null
  }
  const component = await resolveComponentForInstanceMeta(spec)
  if (component === null) {
    return null
  }
  try {
    pushInstanceRestoreDebug(
      `${typeof spec.name === 'string' && spec.name.trim() !== '' ? spec.name.trim() : '(unnamed spec node)'}: createInstance() succeeded`
    )
    return component.createInstance()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown createInstance error'
    pushInstanceRestoreDebug(
      `${typeof spec.name === 'string' && spec.name.trim() !== '' ? spec.name.trim() : '(unnamed spec node)'}: createInstance() failed (${message})`
    )
    return null
  }
}

async function renderSpecNode(spec: SpecNode, parent: BaseNode & ChildrenMixin): Promise<SceneNode> {
  if (spec.type === 'GROUP') {
    if (Array.isArray(spec.children) === false || spec.children.length === 0) {
      throw new Error('GROUP은 최소 1개 이상의 children이 필요합니다.')
    }

    const childNodes: Array<SceneNode> = []
    for (const childSpec of spec.children) {
      const childNode = await renderSpecNode(childSpec, parent)
      childNodes.push(childNode)
    }

    const groupNode = figma.group(childNodes, parent)
    await applyBase(groupNode, spec)
    groupNode.setPluginData(RENDER_SEMANTIC_ID_KEY, getSemanticId(spec.semantic))
    return groupNode
  }

  const restoredInstance = await instantiateFromInstanceMeta(spec)
  const node = restoredInstance ?? await instantiateNonGroupNode(spec)
  parent.appendChild(node)
  const baseSpec = restoredInstance
    ? {
        ...spec,
        fills: undefined,
        strokes: undefined,
        effects: undefined,
        cornerRadius: undefined,
        cornerRadii: undefined
      }
    : spec
  await applyBase(node, baseSpec)
  node.setPluginData(RENDER_SEMANTIC_ID_KEY, getSemanticId(spec.semantic))

  if (
    restoredInstance === null &&
    Array.isArray(spec.children) &&
    spec.children.length > 0 &&
    'appendChild' in node
  ) {
    const childParent = node as BaseNode & ChildrenMixin
    const childNodes: Array<SceneNode> = []
    for (const childSpec of spec.children) {
      const childNode = await renderSpecNode(childSpec, childParent)
      childNodes.push(childNode)
    }

    if (spec.autoGroupChildren === true && childNodes.length > 0) {
      const groupNode = figma.group(childNodes, childParent)
      if (typeof spec.autoGroupName === 'string' && spec.autoGroupName.trim() !== '') {
        groupNode.name = resolveUniqueNameInCurrentPage(spec.autoGroupName.trim(), groupNode.id)
      } else if (typeof spec.name === 'string' && spec.name.trim() !== '') {
        groupNode.name = resolveUniqueNameInCurrentPage(`${spec.name.trim()} Content`, groupNode.id)
      } else {
        groupNode.name = resolveUniqueNameInCurrentPage('Auto Group', groupNode.id)
      }
    }
  }

  return node
}

function parseSpec(jsonSpec: string): SpecNode {
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonSpec)
  } catch (_error) {
    throw new Error('JSON 파싱 실패: 문법을 확인해 주세요.')
  }

  if (parsed === null || typeof parsed !== 'object') {
    throw new Error('최상위 JSON은 객체여야 합니다.')
  }

  const candidate = parsed as { type?: unknown }
  const allowed = new Set([
    'FRAME',
    'GROUP',
    'SECTION',
    'COMPONENT',
    'RECTANGLE',
    'TEXT',
    'ELLIPSE',
    'LINE',
    'POLYGON',
    'STAR',
    'SVG',
    'ICON'
  ])

  if (allowed.has(String(candidate.type)) === false) {
    throw new Error('지원 type: FRAME/GROUP/SECTION/COMPONENT/RECTANGLE/TEXT/ELLIPSE/LINE/POLYGON/STAR/SVG/ICON')
  }

  return parsed as SpecNode
}

function serializePaints(node: SceneNode, warnings: Array<string>): Array<FillSpec> | undefined {
  if ('fills' in node === false || Array.isArray(node.fills) === false || node.fills.length === 0) {
    return undefined
  }

  const fills: Array<FillSpec> = []
  for (const fill of node.fills) {
    if (fill.visible === false) {
      continue
    }
    if (fill.type === 'SOLID') {
      fills.push(rgbaToHex(fill.color, fill.opacity))
      continue
    }
    if (fill.type === 'IMAGE') {
      warnings.push('Image fills are not preserved during Extract to ui_spec yet; the original image URL is not preserved.')
      continue
    }
    if (
      fill.type === 'GRADIENT_LINEAR' ||
      fill.type === 'GRADIENT_RADIAL' ||
      fill.type === 'GRADIENT_ANGULAR' ||
      fill.type === 'GRADIENT_DIAMOND'
    ) {
      fills.push({
        type: fill.type,
        stops: fill.gradientStops.map(function (stop: ColorStop) {
          return {
            color: rgbaToHex(stop.color),
            position: stop.position
          }
        }),
        transform: fill.gradientTransform,
        opacity: fill.opacity
      })
    }
  }

  return fills.length > 0 ? fills : undefined
}

function serializeStrokes(node: SceneNode, warnings: Array<string>): Array<StrokeSpec> | undefined {
  if ('strokes' in node === false || Array.isArray(node.strokes) === false || node.strokes.length === 0) {
    return undefined
  }

  const geometry = node as GeometryMixin
  const strokeAlign = 'strokeAlign' in geometry ? geometry.strokeAlign : 'INSIDE'
  const dashPattern = 'dashPattern' in geometry && Array.isArray((geometry as any).dashPattern)
    ? ((geometry as any).dashPattern as Array<number>)
    : []

  const strokes: Array<StrokeSpec> = []
  for (const stroke of node.strokes) {
    if (stroke.visible === false) {
      continue
    }
    if (stroke.type !== 'SOLID') {
      warnings.push(`Unsupported stroke type ${stroke.type} was omitted during Extract to ui_spec.`)
      continue
    }
    strokes.push({
      color: rgbaToHex(stroke.color, stroke.opacity),
      weight: 'strokeWeight' in geometry ? Number((geometry as any).strokeWeight) : 1,
      align: strokeAlign,
      dashes: dashPattern.length > 0 ? [...dashPattern] : undefined
    })
  }

  return strokes.length > 0 ? strokes : undefined
}

function serializeEffects(node: SceneNode): Array<EffectSpec> | undefined {
  if ('effects' in node === false || Array.isArray(node.effects) === false || node.effects.length === 0) {
    return undefined
  }

  const effects: Array<EffectSpec> = []
  for (const effect of node.effects) {
    if (effect.visible === false) {
      continue
    }
    if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
      effects.push({
        type: effect.type,
        color: rgbaToHex(effect.color),
        x: effect.offset.x,
        y: effect.offset.y,
        blur: effect.radius,
        spread: effect.spread
      })
      continue
    }
    if (effect.type === 'LAYER_BLUR' || effect.type === 'BACKGROUND_BLUR') {
      effects.push({
        type: effect.type,
        radius: effect.radius
      })
    }
  }

  return effects.length > 0 ? effects : undefined
}

function buildMeta(node: SceneNode, warnings: Array<string>): BaseSpecNode['meta'] {
  const sourceSemanticId = node.getPluginData(RENDER_SEMANTIC_ID_KEY) || undefined
  const baseMeta =
    warnings.length > 0
      ? {
          roundTripVersion: '1.0' as const,
          figmaNodeId: node.id,
          figmaNodeType: node.type,
          warnings
        }
      : {
          roundTripVersion: '1.0' as const,
          figmaNodeId: node.id,
          figmaNodeType: node.type
        }

  return sourceSemanticId !== undefined
    ? {
        ...baseMeta,
        sourceSemanticId
      }
    : baseMeta
}

function getSemanticId(value: unknown): string {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return ''
  }
  const candidate = (value as { id?: unknown }).id
  return typeof candidate === 'string' && candidate.trim() !== '' ? candidate.trim() : ''
}

function serializeBaseNode(node: SceneNode, warnings: Array<string>): BaseSpecNode {
  const base: BaseSpecNode = {
    type: node.type as UiNodeType,
    name: node.name,
    x: node.x,
    y: node.y,
    visible: node.visible,
    locked: node.locked,
    meta: buildMeta(node, warnings)
  }

  if ('width' in node && typeof node.width === 'number') {
    base.width = node.width
  }
  if ('height' in node && typeof node.height === 'number') {
    base.height = node.height
  }
  if ('rotation' in node && typeof node.rotation === 'number' && node.rotation !== 0) {
    base.rotation = node.rotation
  }
  if ('opacity' in node && typeof node.opacity === 'number' && node.opacity !== 1) {
    base.opacity = node.opacity
  }
  if ('blendMode' in node && typeof node.blendMode === 'string' && node.blendMode !== 'PASS_THROUGH') {
    base.blendMode = node.blendMode as BlendModeSpec
  }
  if ('constraints' in node) {
    base.constraints = {
      horizontal: node.constraints.horizontal,
      vertical: node.constraints.vertical
    }
  }
  if ('layoutAlign' in node && typeof node.layoutAlign === 'string' && node.layoutAlign !== 'INHERIT') {
    base.layoutAlign = node.layoutAlign
  }
  if ('layoutGrow' in node && typeof node.layoutGrow === 'number' && node.layoutGrow !== 0) {
    base.layoutGrow = node.layoutGrow
  }
  if ('layoutPositioning' in node && typeof node.layoutPositioning === 'string' && node.layoutPositioning !== 'AUTO') {
    base.layoutPositioning = node.layoutPositioning
  }
  if ('cornerRadius' in node && typeof node.cornerRadius === 'number' && node.cornerRadius !== 0) {
    base.cornerRadius = node.cornerRadius
  }
  if ('topLeftRadius' in node) {
    const corners = [
      node.topLeftRadius,
      node.topRightRadius,
      node.bottomRightRadius,
      node.bottomLeftRadius
    ]
    if (corners.some(function (value) { return value !== 0 })) {
      base.cornerRadii = corners as [number, number, number, number]
    }
  }

  const fills = serializePaints(node, warnings)
  if (fills) {
    base.fills = fills
  }
  const strokes = serializeStrokes(node, warnings)
  if (strokes) {
    base.strokes = strokes
  }
  const effects = serializeEffects(node)
  if (effects) {
    base.effects = effects
  }

  return base
}

function serializeFrameLikeNode(node: SceneNode, warnings: Array<string>): FrameLikeSpecNode {
  const spec = serializeBaseNode(node, warnings) as FrameLikeSpecNode
  const frameLike = node as SceneNode & {
    layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL'
    itemSpacing?: number
    paddingTop?: number
    paddingRight?: number
    paddingBottom?: number
    paddingLeft?: number
    primaryAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN'
    counterAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'BASELINE'
    clipsContent?: boolean
  }
  if (typeof frameLike.layoutMode === 'string') {
    spec.layoutMode = frameLike.layoutMode
  }
  if (typeof frameLike.itemSpacing === 'number' && frameLike.itemSpacing !== 0) {
    spec.itemSpacing = frameLike.itemSpacing
  }
  if (typeof frameLike.paddingTop === 'number' && frameLike.paddingTop !== 0) {
    spec.paddingTop = frameLike.paddingTop
  }
  if (typeof frameLike.paddingRight === 'number' && frameLike.paddingRight !== 0) {
    spec.paddingRight = frameLike.paddingRight
  }
  if (typeof frameLike.paddingBottom === 'number' && frameLike.paddingBottom !== 0) {
    spec.paddingBottom = frameLike.paddingBottom
  }
  if (typeof frameLike.paddingLeft === 'number' && frameLike.paddingLeft !== 0) {
    spec.paddingLeft = frameLike.paddingLeft
  }
  if (typeof frameLike.primaryAxisAlignItems === 'string' && frameLike.primaryAxisAlignItems !== 'MIN') {
    spec.primaryAxisAlignItems = frameLike.primaryAxisAlignItems
  }
  if (typeof frameLike.counterAxisAlignItems === 'string' && frameLike.counterAxisAlignItems !== 'MIN') {
    spec.counterAxisAlignItems = frameLike.counterAxisAlignItems
  }
  if (frameLike.clipsContent === true) {
    spec.clipsContent = true
  }
  return spec
}

function serializeInstanceReference(node: InstanceNode): NonNullable<BaseSpecNode['meta']>['instanceOf'] | undefined {
  const mainComponent = node.mainComponent
  if (mainComponent === null) {
    return undefined
  }

  const instanceOf: NonNullable<BaseSpecNode['meta']>['instanceOf'] = {
    componentId: mainComponent.id,
    componentName: mainComponent.name
  }
  if (mainComponent.description.trim().length > 0) {
    instanceOf.componentDescription = mainComponent.description
  }
  if (mainComponent.descriptionMarkdown.trim().length > 0) {
    instanceOf.componentDescriptionMarkdown = mainComponent.descriptionMarkdown
  }

  const variantProperties = (node as unknown as { variantProperties?: Record<string, string> }).variantProperties
  if (variantProperties && typeof variantProperties === 'object' && Object.keys(variantProperties).length > 0) {
    instanceOf.variantProperties = { ...variantProperties }
  }

  const parent = mainComponent.parent
  if (parent !== null && parent.type === 'COMPONENT_SET') {
    instanceOf.componentSetId = parent.id
    instanceOf.componentSetName = parent.name
    if (parent.description.trim().length > 0) {
      instanceOf.componentSetDescription = parent.description
    }
    if (parent.descriptionMarkdown.trim().length > 0) {
      instanceOf.componentSetDescriptionMarkdown = parent.descriptionMarkdown
    }

    const availableVariants = parent.children
      .filter(function (child): child is ComponentNode {
        return child.type === 'COMPONENT'
      })
      .map(function (child) {
        const childVariantProps = (child as unknown as { variantProperties?: Record<string, string> }).variantProperties
        return {
          componentId: child.id,
          componentName: child.name,
          componentDescription: child.description.trim().length > 0 ? child.description : undefined,
          componentDescriptionMarkdown:
            child.descriptionMarkdown.trim().length > 0 ? child.descriptionMarkdown : undefined,
          variantProperties:
            childVariantProps && typeof childVariantProps === 'object' && Object.keys(childVariantProps).length > 0
              ? { ...childVariantProps }
              : undefined
        }
      })

    if (availableVariants.length > 0) {
      instanceOf.availableVariants = availableVariants
    }
  }

  return instanceOf
}

async function serializeUnsupportedNodeAsSvg(node: SceneNode, warnings: Array<string>): Promise<SvgSpecNode> {
  const bytes = await node.exportAsync({
    format: 'SVG'
  })
  const svg = decodeUtf8(bytes)
  const base = serializeBaseNode(node, warnings) as SvgSpecNode
  base.type = 'SVG'
  base.svg = svg
  return base
}

function shouldSerializeNode(node: SceneNode): boolean {
  return SUPPORTED_EXPORT_TYPES.has(node.type)
}

async function serializeSceneNode(node: SceneNode): Promise<SpecNode> {
  const warnings: Array<string> = []

  if (node.type === 'VECTOR' || node.type === 'BOOLEAN_OPERATION') {
    warnings.push(`${node.type} exported as SVG snapshot for Extract to ui_spec compatibility.`)
    return serializeUnsupportedNodeAsSvg(node, warnings)
  }

  if (node.type === 'INSTANCE') {
    warnings.push('INSTANCE exported as FRAME snapshot; component binding is not preserved yet.')
    const spec = serializeFrameLikeNode(node as unknown as FrameNode, warnings) as FrameSpecNode
    spec.type = 'FRAME'
    if (spec.meta) {
      const instanceOf = serializeInstanceReference(node)
      if (instanceOf) {
        spec.meta.instanceOf = instanceOf
      }
    }
    spec.children = await serializeChildren(node)
    return spec
  }

  if (node.type === 'FRAME') {
    if (node.getPluginData('svgRoot') === 'true') {
      return serializeUnsupportedNodeAsSvg(node, warnings)
    }
    const spec = serializeFrameLikeNode(node, warnings) as FrameSpecNode
    spec.type = 'FRAME'
    spec.children = await serializeChildren(node)
    return spec
  }
  if (node.type === 'SECTION') {
    const spec = serializeFrameLikeNode(node, warnings) as SectionSpecNode
    spec.type = 'SECTION'
    spec.children = await serializeChildren(node)
    return spec
  }
  if (node.type === 'COMPONENT') {
    const spec = serializeFrameLikeNode(node, warnings) as ComponentSpecNode
    spec.type = 'COMPONENT'
    spec.children = await serializeChildren(node)
    return spec
  }
  if (node.type === 'GROUP') {
    const spec = serializeBaseNode(node, warnings) as GroupSpecNode
    spec.type = 'GROUP'
    spec.children = await serializeChildren(node)
    return spec
  }
  if (node.type === 'TEXT') {
    const spec = serializeBaseNode(node, warnings) as TextSpecNode
    spec.type = 'TEXT'
    spec.text = node.characters
    if (node.fontName !== figma.mixed) {
      spec.fontFamily = node.fontName.family
      spec.fontStyle = node.fontName.style
    } else {
      warnings.push('Mixed font styles detected; text font metadata was omitted.')
    }
    if (node.fontSize !== figma.mixed && typeof node.fontSize === 'number') {
      spec.fontSize = node.fontSize
    }
    if (node.lineHeight !== figma.mixed && node.lineHeight.unit === 'PIXELS') {
      spec.lineHeightPx = node.lineHeight.value
    }
    if (node.letterSpacing !== figma.mixed && node.letterSpacing.unit === 'PIXELS') {
      spec.letterSpacingPx = node.letterSpacing.value
    }
    if (node.textCase !== figma.mixed) {
      spec.textCase = node.textCase
    }
    if (node.textDecoration !== figma.mixed) {
      spec.textDecoration = node.textDecoration
    }
    spec.textAlignHorizontal = node.textAlignHorizontal
    spec.textAlignVertical = node.textAlignVertical
    spec.textAutoResize = node.textAutoResize
    spec.meta = buildMeta(node, warnings)
    return spec
  }
  if (node.type === 'RECTANGLE') {
    const spec = serializeBaseNode(node, warnings) as RectangleSpecNode
    spec.type = 'RECTANGLE'
    return spec
  }
  if (node.type === 'ELLIPSE') {
    const spec = serializeBaseNode(node, warnings) as EllipseSpecNode
    spec.type = 'ELLIPSE'
    if (typeof node.arcData.startingAngle === 'number' || typeof node.arcData.endingAngle === 'number') {
      spec.arcData = {
        startingAngle: node.arcData.startingAngle,
        endingAngle: node.arcData.endingAngle,
        innerRadius: node.arcData.innerRadius
      }
    }
    return spec
  }
  if (node.type === 'LINE') {
    const spec = serializeBaseNode(node, warnings) as LineSpecNode
    spec.type = 'LINE'
    return spec
  }
  if (node.type === 'POLYGON') {
    const spec = serializeBaseNode(node, warnings) as PolygonSpecNode
    spec.type = 'POLYGON'
    spec.pointCount = node.pointCount
    return spec
  }
  if (node.type === 'STAR') {
    const spec = serializeBaseNode(node, warnings) as StarSpecNode
    spec.type = 'STAR'
    spec.pointCount = node.pointCount
    spec.innerRadius = node.innerRadius
    return spec
  }

  warnings.push(`Unsupported node type ${node.type}; exported as SVG snapshot.`)
  return serializeUnsupportedNodeAsSvg(node, warnings)
}

async function serializeChildren(parent: BaseNode & ChildrenMixin): Promise<Array<SpecNode>> {
  const result: Array<SpecNode> = []
  for (const child of parent.children) {
    if (child.type === 'SLICE' || child.type === 'CONNECTOR' || child.type === 'STAMP') {
      continue
    }
    if (shouldSerializeNode(child) === false) {
      result.push(await serializeUnsupportedNodeAsSvg(child, [`Unsupported node type ${child.type}; exported as SVG snapshot.`]))
      continue
    }
    result.push(await serializeSceneNode(child))
  }
  return result
}

function normalizeSyncUrl(syncUrl: string): string {
  return syncUrl.trim().replace(/\/+$/, '')
}

function isPluginGeneratedRoot(node: SceneNode): boolean {
  return node.getPluginData(RENDER_ROOT_PLUGIN_DATA_KEY) === 'true'
}

type JsonRecord = Record<string, unknown>

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && Array.isArray(value) === false
}

function buildSemanticIndex(node: unknown, index: Map<string, unknown>): void {
  if (isJsonRecord(node) === false) {
    return
  }
  const meta = isJsonRecord(node.meta) ? node.meta : null
  const figmaNodeId = meta !== null && typeof meta.figmaNodeId === 'string' ? meta.figmaNodeId : ''
  const semanticId = getSemanticId(node.semantic)
  if (figmaNodeId !== '' && node.semantic !== undefined) {
    index.set(`figma:${figmaNodeId}`, node.semantic)
  }
  if (semanticId !== '' && node.semantic !== undefined) {
    index.set(`semantic:${semanticId}`, node.semantic)
  }
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      buildSemanticIndex(child, index)
    }
  }
}

function mergeSemanticFromBase(baseSpec: unknown, extractedSpec: unknown): unknown {
  if (isJsonRecord(baseSpec) === false || isJsonRecord(extractedSpec) === false) {
    return extractedSpec
  }

  const semanticByKey = new Map<string, unknown>()
  buildSemanticIndex(baseSpec, semanticByKey)

  function apply(node: unknown): unknown {
    if (isJsonRecord(node) === false) {
      return node
    }
    const nextNode: JsonRecord = { ...node }
    const meta = isJsonRecord(nextNode.meta) ? nextNode.meta : null
    const figmaNodeId = meta !== null && typeof meta.figmaNodeId === 'string' ? meta.figmaNodeId : ''
    const sourceSemanticId =
      meta !== null && typeof meta.sourceSemanticId === 'string' ? meta.sourceSemanticId : ''
    if (figmaNodeId !== '' && semanticByKey.has(`figma:${figmaNodeId}`)) {
      nextNode.semantic = semanticByKey.get(`figma:${figmaNodeId}`)
    } else if (sourceSemanticId !== '' && semanticByKey.has(`semantic:${sourceSemanticId}`)) {
      nextNode.semantic = semanticByKey.get(`semantic:${sourceSemanticId}`)
    }
    if (Array.isArray(nextNode.children)) {
      nextNode.children = nextNode.children.map(apply)
    }
    return nextNode
  }

  return apply(extractedSpec)
}

function emitCurrentTargetNodeStatus(runtimeUiPrefs: UiPrefs): void {
  const targetNodeId = runtimeUiPrefs.targetNodeId?.trim() ?? ''
  if (targetNodeId === '') {
    emit<TargetNodeStatusHandler>('TARGET_NODE_STATUS', {
      ok: false,
      canExtract: false,
      message: 'Target node가 설정되지 않았습니다.'
    })
    return
  }

  const targetNode = figma.getNodeById(targetNodeId) as SceneNode | null
  if (targetNode === null) {
    emit<TargetNodeStatusHandler>('TARGET_NODE_STATUS', {
      ok: false,
      canExtract: false,
      message: '설정된 target node를 찾을 수 없습니다.'
    })
    return
  }

  const canExtract = isPluginGeneratedRoot(targetNode)
  emit<TargetNodeStatusHandler>('TARGET_NODE_STATUS', {
    ok: true,
    canExtract,
    nodeId: targetNode.id,
    nodeName: targetNode.name,
    sourceFile: targetNode.getPluginData(RENDER_SOURCE_FILE_KEY) || undefined,
    message: canExtract
      ? `대상 노드 설정 완료: ${targetNode.name}`
      : `대상 노드 설정 완료: ${targetNode.name} (Extract to ui_spec 비지원)`
  })
}

function resolveExportNode(sourceMode: ExportSourceMode, runtimeUiPrefs: UiPrefs): SceneNode {
  if (sourceMode === 'target') {
    const targetNodeId = runtimeUiPrefs.targetNodeId?.trim() ?? ''
    if (targetNodeId === '') {
      throw new Error('target export requires a configured target node')
    }
    const targetNode = figma.getNodeById(targetNodeId) as SceneNode | null
    if (targetNode === null) {
      throw new Error('configured target node not found')
    }
    if (isPluginGeneratedRoot(targetNode) === false) {
      throw new Error('Extract to ui_spec는 plugin이 생성한 root node에서만 지원합니다.')
    }
    return targetNode
  }

  const selection = figma.currentPage.selection
  if (selection.length !== 1) {
    throw new Error('캔버스에서 sync할 노드 1개를 선택해 주세요.')
  }
  return selection[0]
}

function findNodeIndex(parent: BaseNode & ChildrenMixin, childId: string): number {
  return parent.children.findIndex(function (node) {
    return node.id === childId
  })
}

type Bounds = {
  x: number
  y: number
  width: number
  height: number
}

function getBounds(node: SceneNode): Bounds | null {
  if ('width' in node && 'height' in node) {
    const width = Number((node as SceneNode & { width: number }).width)
    const height = Number((node as SceneNode & { height: number }).height)
    if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
      return {
        x: node.x,
        y: node.y,
        width,
        height
      }
    }
  }
  return null
}

function isOverlapping(a: Bounds, b: Bounds): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  )
}

function resolveFreePositionInCurrentPage(
  node: SceneNode,
  preferredX: number,
  preferredY: number,
  ignoreNodeIds: Set<string>
): { x: number; y: number } {
  const nodeBounds = getBounds(node)
  if (nodeBounds === null) {
    return { x: preferredX, y: preferredY }
  }

  const occupied: Array<Bounds> = []
  for (const sibling of figma.currentPage.children) {
    if (ignoreNodeIds.has(sibling.id)) {
      continue
    }
    if (sibling.type === 'FRAME') {
      continue
    }
    const siblingBounds = getBounds(sibling)
    if (siblingBounds !== null) {
      occupied.push(siblingBounds)
    }
  }

  const step = 80
  const maxRing = 40
  const signs: Array<[number, number]> = [[1, 1], [-1, 1], [1, -1], [-1, -1]]
  for (let ring = 0; ring <= maxRing; ring += 1) {
    for (let dx = 0; dx <= ring; dx += 1) {
      const dy = ring - dx
      for (const [sx, sy] of signs) {
        const candidateX = preferredX + dx * step * sx
        const candidateY = preferredY + dy * step * sy
        const candidate: Bounds = {
          x: candidateX,
          y: candidateY,
          width: nodeBounds.width,
          height: nodeBounds.height
        }
        const hasOverlap = occupied.some(function (target) {
          return isOverlapping(candidate, target)
        })
        if (hasOverlap === false) {
          return { x: candidateX, y: candidateY }
        }
      }
    }
  }

  return { x: preferredX, y: preferredY }
}

function normalizeUiWindowSize(prefs: UiPrefs): Required<Pick<UiPrefs, 'uiWidth' | 'uiHeight'>> {
  const width =
    typeof prefs.uiWidth === 'number' && Number.isFinite(prefs.uiWidth)
      ? Math.max(MIN_UI_WIDTH, Math.round(prefs.uiWidth))
      : DEFAULT_UI_WIDTH
  const height =
    typeof prefs.uiHeight === 'number' && Number.isFinite(prefs.uiHeight)
      ? Math.max(MIN_UI_HEIGHT, Math.round(prefs.uiHeight))
      : DEFAULT_UI_HEIGHT
  return {
    uiWidth: width,
    uiHeight: height
  }
}

export default function () {
  const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  let lastRenderedNodeId: string | null = null
  let runtimeUiPrefs: UiPrefs = { ...DEFAULT_UI_PREFS }

  function sanitizePersistentPrefs(prefs: UiPrefs): UiPrefs {
    return {
      syncUrl: prefs.syncUrl,
      uiWidth: prefs.uiWidth,
      uiHeight: prefs.uiHeight
    }
  }

  async function loadUiPrefs(): Promise<UiPrefs> {
    runtimeUiPrefs = { ...DEFAULT_UI_PREFS }
    try {
      const stored = await figma.clientStorage.getAsync(UI_PREFS_STORAGE_KEY)
      if (stored !== null && typeof stored === 'object') {
        runtimeUiPrefs = {
          ...DEFAULT_UI_PREFS,
          ...sanitizePersistentPrefs(stored as UiPrefs)
        }
      }
      runtimeUiPrefs = {
        ...runtimeUiPrefs,
        ...normalizeUiWindowSize(runtimeUiPrefs)
      }
    } catch (_error) {
      // ignore storage read failure; runtime defaults remain
    }
    return runtimeUiPrefs
  }

  async function saveUiPrefs(nextPrefs: UiPrefs): Promise<void> {
    runtimeUiPrefs = {
      ...runtimeUiPrefs,
      ...nextPrefs
    }
    runtimeUiPrefs = {
      ...runtimeUiPrefs,
      ...normalizeUiWindowSize(runtimeUiPrefs)
    }
    try {
      await figma.clientStorage.setAsync(UI_PREFS_STORAGE_KEY, sanitizePersistentPrefs(runtimeUiPrefs))
    } catch (_error) {
      // ignore storage write failure
    }
  }

  on<RenderUiSpecHandler>('RENDER_UI_SPEC', async function (payload) {
    try {
      instanceRestoreDebugLogs = []
      const jsonSpec = typeof payload === 'string' ? payload : payload.jsonSpec
      const focusViewport =
        typeof payload === 'string'
          ? true
          : payload.focusViewport !== false
      const renderMode: RenderMode =
        typeof payload === 'string'
          ? 'session'
          : payload.renderMode === 'target'
            ? 'target'
            : 'session'
      const targetNodeId =
        typeof payload === 'string'
          ? undefined
          : payload.targetNodeId
      const sourceFile =
        typeof payload === 'string'
          ? undefined
          : payload.sourceFile
      const trackedPreviousNode =
        typeof lastRenderedNodeId === 'string'
          ? (figma.getNodeById(lastRenderedNodeId) as SceneNode | null)
          : null
      const existingSessionRoots = figma.currentPage.findAll(function (node) {
        return (
          node.getPluginData(RENDER_ROOT_PLUGIN_DATA_KEY) === 'true' &&
          node.getPluginData(RENDER_SESSION_PLUGIN_DATA_KEY) === sessionId
        )
      })
      const previousNode = trackedPreviousNode ?? existingSessionRoots[0] ?? null
      const spec = parseSpec(jsonSpec)
      let node: SceneNode

      if (renderMode === 'target') {
        if (typeof targetNodeId !== 'string' || targetNodeId.trim() === '') {
          throw new Error('target mode requires targetNodeId')
        }
        const targetNode = figma.getNodeById(targetNodeId) as SceneNode | null
        if (targetNode === null) {
          throw new Error('target node not found')
        }
        if (targetNode.parent === null || ('appendChild' in targetNode.parent) === false) {
          throw new Error('target node parent is invalid')
        }
        const parent = targetNode.parent as BaseNode & ChildrenMixin
        const targetIndex = findNodeIndex(parent, targetNode.id)
        node = await renderSpecNode(spec, parent)
        node.setPluginData(RENDER_ROOT_PLUGIN_DATA_KEY, 'true')
        node.setPluginData(RENDER_SESSION_PLUGIN_DATA_KEY, sessionId)
        node.setPluginData(RENDER_SOURCE_FILE_KEY, sourceFile ?? '')
        node.x = targetNode.x
        node.y = targetNode.y
        if ('insertChild' in (parent as any) && targetIndex >= 0) {
          ;(parent as ChildrenMixin).insertChild(targetIndex, node)
        }
        targetNode.remove()
        if (typeof spec.name === 'string' && spec.name.trim() !== '') {
          node.name = spec.name.trim()
        }
        await saveUiPrefs({
          targetNodeId: node.id,
          targetNodeName: node.name
        })
        emit<TargetNodeStatusHandler>('TARGET_NODE_STATUS', {
          ok: true,
          canExtract: isPluginGeneratedRoot(node),
          nodeId: node.id,
          nodeName: node.name,
          sourceFile: node.getPluginData(RENDER_SOURCE_FILE_KEY) || undefined,
          message: `대상 노드 갱신 완료: ${node.name}`
        })
      } else {
        node = await renderSpecNode(spec, figma.currentPage)
        node.setPluginData(RENDER_ROOT_PLUGIN_DATA_KEY, 'true')
        node.setPluginData(RENDER_SESSION_PLUGIN_DATA_KEY, sessionId)
        node.setPluginData(RENDER_SOURCE_FILE_KEY, sourceFile ?? '')
        if (focusViewport === false && previousNode !== null) {
          // Keep canvas placement stable during realtime sync updates.
          node.x = previousNode.x
          node.y = previousNode.y
        }
        const ignoredIds = new Set<string>([node.id])
        const viewportCenter = figma.viewport.center
        const nodeWidth = 'width' in node ? node.width : 0
        const nodeHeight = 'height' in node ? node.height : 0
        const preferredX = focusViewport ? viewportCenter.x - nodeWidth / 2 : node.x
        const preferredY = focusViewport ? viewportCenter.y - nodeHeight / 2 : node.y
        const freePosition = resolveFreePositionInCurrentPage(node, preferredX, preferredY, ignoredIds)
        node.x = freePosition.x
        node.y = freePosition.y
      }
      lastRenderedNodeId = node.id
      if (focusViewport) {
        figma.currentPage.selection = [node]
        figma.viewport.scrollAndZoomIntoView([node])
      }

      emit<UiStatusHandler>('UI_STATUS', {
        kind: 'success',
        message: '렌더링 완료: 확장 스펙으로 노드를 생성했습니다.'
      })
      if (instanceRestoreDebugLogs.length > 0) {
        const summary = instanceRestoreDebugLogs[instanceRestoreDebugLogs.length - 1]
        figma.notify(`UI spec rendered (${summary})`, { timeout: 2500 })
      } else {
        figma.notify('UI spec rendered')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류'
      emit<UiStatusHandler>('UI_STATUS', {
        kind: 'error',
        message: `실패: ${message}`
      })
      figma.notify(`Render failed: ${message}`)
    }
  })

  on<CloseHandler>('CLOSE', function () {
    saveUiPrefs({
      ...DEFAULT_UI_PREFS,
      uiWidth: runtimeUiPrefs.uiWidth,
      uiHeight: runtimeUiPrefs.uiHeight
    })
      .finally(function () {
        figma.closePlugin()
      })
  })

  on<GetUiPrefsHandler>('GET_UI_PREFS', async function () {
    const prefs = await loadUiPrefs()
    emit<UiPrefsHandler>('UI_PREFS', prefs)
    emitCurrentTargetNodeStatus(prefs)
  })

  on<SetUiPrefsHandler>('SET_UI_PREFS', async function (prefs) {
    await saveUiPrefs(prefs)
    if (prefs.targetNodeId !== undefined || prefs.targetNodeName !== undefined) {
      emitCurrentTargetNodeStatus(runtimeUiPrefs)
    }
  })

  on<ResizeUiWindowHandler>('RESIZE_UI_WINDOW', async function (payload) {
    const nextWidth = Math.max(MIN_UI_WIDTH, Math.round(payload.width))
    const nextHeight = Math.max(MIN_UI_HEIGHT, Math.round(payload.height))
    figma.ui.resize(nextWidth, nextHeight)
    await saveUiPrefs({
      uiWidth: nextWidth,
      uiHeight: nextHeight
    })
    emit<UiPrefsHandler>('UI_PREFS', runtimeUiPrefs)
  })

  on<UseSelectedNodeAsTargetHandler>('USE_SELECTED_NODE_AS_TARGET', async function () {
    try {
      const selection = figma.currentPage.selection
      if (selection.length !== 1) {
        emit<TargetNodeStatusHandler>('TARGET_NODE_STATUS', {
          ok: false,
          message: '캔버스에서 대상 노드 1개를 선택해 주세요.'
        })
        return
      }
      const node = selection[0]
      const nodeSourceFile = node.getPluginData(RENDER_SOURCE_FILE_KEY) || undefined
      await saveUiPrefs({
        targetNodeId: node.id,
        targetNodeName: node.name
      })
      emit<TargetNodeStatusHandler>('TARGET_NODE_STATUS', {
        ok: true,
        canExtract: isPluginGeneratedRoot(node),
        nodeId: node.id,
        nodeName: node.name,
        sourceFile: nodeSourceFile,
        message: isPluginGeneratedRoot(node)
          ? `대상 노드 설정 완료: ${node.name}`
          : `대상 노드 설정 완료: ${node.name} (Extract to ui_spec 비지원)`
      })
    } catch (_error) {
      emit<TargetNodeStatusHandler>('TARGET_NODE_STATUS', {
        ok: false,
        message: '대상 노드 설정 실패'
      })
    }
  })

  on<GetTargetNodeStatusHandler>('GET_TARGET_NODE_STATUS', async function () {
    emitCurrentTargetNodeStatus(runtimeUiPrefs)
  })

  on<PushSelectionToActiveFileHandler>('PUSH_SELECTION_TO_ACTIVE_FILE', async function (payload) {
    try {
      const syncUrl = normalizeSyncUrl(payload.syncUrl)
      const destinationFile = payload.destinationFile.trim()
      if (syncUrl === '') {
        throw new Error('sync URL이 비어 있습니다.')
      }
      if (destinationFile === '') {
        throw new Error('destination ui_spec 파일이 비어 있습니다.')
      }

      const sourceNode = resolveExportNode(payload.sourceMode, runtimeUiPrefs)
      const extractedSpec = await serializeSceneNode(sourceNode)
      const spec = mergeSemanticFromBase(payload.baseSpec, extractedSpec)
      const response = await fetch(`${syncUrl}/spec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          file: destinationFile,
          spec
        })
      })

      if (response.ok === false) {
        let detail = `HTTP ${response.status}`
        try {
          const body = (await response.json()) as { error?: string }
          if (typeof body.error === 'string' && body.error.trim() !== '') {
            detail = `${detail} - ${body.error}`
          }
        } catch (_error) {
          // ignore parse failure
        }
        throw new Error(detail)
      }

      figma.notify(`Updated ${destinationFile} from Figma`)
      emit<UiStatusHandler>('UI_STATUS', {
        kind: 'success',
        message: `${sourceNode.name} -> ${destinationFile} semantic merge 완료`
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류'
      emit<UiStatusHandler>('UI_STATUS', {
        kind: 'error',
        message: `Figma -> ui_spec extract 실패: ${message}`
      })
      figma.notify('Figma extract failed')
    }
  })

  loadUiPrefs()
    .catch(function () {
      return DEFAULT_UI_PREFS
    })
    .finally(function () {
      const windowSize = normalizeUiWindowSize(runtimeUiPrefs)
      showUI({
        height: windowSize.uiHeight,
        width: windowSize.uiWidth
      })
    })
}
