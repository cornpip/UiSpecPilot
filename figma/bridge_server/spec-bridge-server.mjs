#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { URL } from 'node:url'

const args = process.argv.slice(2)
const rootDir = process.cwd()

function readArg(name, fallback) {
  const key = `--${name}`
  const index = args.indexOf(key)
  if (index === -1) {
    return fallback
  }
  const value = args[index + 1]
  if (typeof value !== 'string' || value.startsWith('--')) {
    return fallback
  }
  return value
}

const port = Number.parseInt(readArg('port', '4311'), 10)
const baseDir = path.resolve(rootDir, readArg('base-dir', '.'))
const specRootArg = readArg('spec-root', 'ui_spec/samples')
const uiSpecDir = path.resolve(baseDir, specRootArg)
const irOutputRootArg = readArg('ir-output-root', 'compilers/flutter_ir/out')
const irOutputDir = path.resolve(baseDir, irOutputRootArg)
const initialFileArg = readArg('file', `${specRootArg}/start.json`)
const allowedRootTypes = new Set([
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

let currentRevision = 0
let currentSpecText = JSON.stringify(
  {
    type: 'FRAME',
    name: 'Realtime Sync Root',
    x: 100,
    y: 100,
    width: 360,
    height: 240,
    fills: [
      {
        type: 'GRADIENT_LINEAR',
        stops: [
          { color: '#F8F9FF', position: 0 },
          { color: '#F1F4FF', position: 1 }
        ]
      }
    ],
    children: [
      {
        type: 'TEXT',
        name: 'Header Title',
        x: 24,
        y: 24,
        text: 'Sync Connected',
        fontSize: 24,
        fontWeight: 'bold',
        fills: ['#2A2E39']
      }
    ]
  },
  null,
  2
)
let currentFilePath = ''
let watchedFilePath = ''
const sseClients = new Set()

function validateRootSpec(spec) {
  if (spec === null || typeof spec !== 'object') {
    throw new Error('spec root must be an object')
  }
  const type = String(spec.type ?? '')
  if (allowedRootTypes.has(type) === false) {
    throw new Error(
      'unsupported root type; expected FRAME/GROUP/SECTION/COMPONENT/RECTANGLE/TEXT/ELLIPSE/LINE/POLYGON/STAR/SVG/ICON'
    )
  }
}

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function createPayload(type = 'update') {
  let parsed = {}
  try {
    parsed = JSON.parse(currentSpecText)
  } catch (_error) {
    parsed = {}
  }
  return {
    type,
    revision: currentRevision,
    file: path.relative(baseDir, currentFilePath),
    spec: parsed
  }
}

function createFilePayload(filePath, type = 'snapshot') {
  const text = fs.readFileSync(filePath, 'utf8')
  const parsed = JSON.parse(text)
  validateRootSpec(parsed)
  return {
    type,
    revision: currentRevision,
    file: path.relative(baseDir, filePath),
    spec: parsed
  }
}

function sendSseEvent(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`)
}

function broadcast(payload) {
  for (const client of sseClients) {
    sendSseEvent(client, payload)
  }
}

function assertPathInScope(targetPath, scopeDir) {
  const normalizedBase = path.resolve(scopeDir)
  const normalizedTarget = path.resolve(targetPath)
  const relative = path.relative(normalizedBase, normalizedTarget)
  if (relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))) {
    return normalizedTarget
  }
  throw new Error(`path is outside allowed directory: ${targetPath}`)
}

function asRecord(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }
  return value
}

function asString(value) {
  return typeof value === 'string' ? value : ''
}

function sanitizeId(value, fallback) {
  const normalized = String(value ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9_/-]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return normalized === '' ? fallback : normalized
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value))
}

function parseJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function normalizeSemanticType(value) {
  const semanticType = asString(value).trim()
  return semanticType === '' ? '' : semanticType
}

function normalizeVariantPropertyKey(value) {
  return asString(value).trim().toLowerCase().replace(/[\s_-]+/g, '')
}

function appendMemoPart(parts, value) {
  const text = asString(value).trim()
  if (text === '') {
    return
  }
  if (!parts.includes(text)) {
    parts.push(text)
  }
}

function normalizeStateHintText(value) {
  return asString(value).trim().toLowerCase()
}

function inferStateHintsFromText(value) {
  const text = normalizeStateHintText(value)
  if (text === '') {
    return {
      selected: false,
      checked: false,
      default: false,
      active: false
    }
  }

  return {
    selected: /^(selected|선택됨)$/.test(text),
    checked: /^(checked|check|체크|체크됨)$/.test(text),
    default: /^(default|기본)$/.test(text),
    active: /^(active|활성|활성됨)$/.test(text)
  }
}

function mergeStateHints(target, hints) {
  if (hints.selected) {
    target.selected = true
  }
  if (hints.checked) {
    target.checked = true
  }
  if (hints.default) {
    target.default = true
  }
  if (hints.active) {
    target.active = true
  }
}

function buildSemanticMemoParts(specNode, semantic) {
  const parts = []
  const semanticNotes = asString(semantic?.notes)
  const semanticLabel = asString(semantic?.label)
  const semanticType = normalizeSemanticType(semantic?.type)
  const interaction = asRecord(semantic?.interaction)
  const onTap = asRecord(interaction?.onTap)
  const componentRef = asRecord(semantic?.componentRef)

  appendMemoPart(parts, semanticNotes)
  if (semanticNotes === '') {
    appendMemoPart(parts, semanticLabel)
  } else if (semanticLabel !== '' && semanticLabel !== semanticNotes) {
    appendMemoPart(parts, semanticLabel)
  }

  if (semanticType === 'heading' || semanticType === 'label' || semanticType === 'buttonLabel' || semanticType === 'listItem' || semanticType === 'appBar') {
    appendMemoPart(parts, `semantic:${semanticType}`)
  } else if (
    semanticType !== '' &&
    semanticType !== 'row' &&
    semanticType !== 'column' &&
    semanticType !== 'button' &&
    semanticType !== 'list' &&
    semanticType !== 'pageView' &&
    semanticType !== 'icon' &&
    semanticType !== 'image'
  ) {
    appendMemoPart(parts, `semantic:${semanticType}`)
  }

  return parts
}

function joinMemoParts(parts) {
  const filtered = parts.filter(function (value) {
    return typeof value === 'string' && value.trim() !== ''
  })
  return filtered.join(' | ')
}

function hasTapInteraction(semantic) {
  const interaction = asRecord(semantic?.interaction)
  const onTap = asRecord(interaction?.onTap)
  return asString(onTap?.type) !== ''
}

function inferNodeType(specNode, targetVersion = '0.1') {
  const semantic = asRecord(specNode.semantic)
  const semanticType = normalizeSemanticType(semantic?.type)
  const uiType = asString(specNode.type)
  const layoutMode = asString(specNode.layoutMode)

  if (targetVersion === '0.2') {
    if (
      semanticType === 'row' ||
      semanticType === 'column' ||
      semanticType === 'button' ||
      semanticType === 'list' ||
      semanticType === 'listItem' ||
      semanticType === 'pageView' ||
      semanticType === 'icon' ||
      semanticType === 'image' ||
      semanticType === 'textField' ||
      semanticType === 'datePicker' ||
      semanticType === 'timePicker' ||
      semanticType === 'checkbox' ||
      semanticType === 'radio' ||
      semanticType === 'tab' ||
      semanticType === 'segmentedOption' ||
      semanticType === 'appBar'
    ) {
      return semanticType
    }
    if (semanticType === 'heading' || semanticType === 'label' || semanticType === 'buttonLabel') {
      return 'text'
    }
  }

  if (semanticType === 'row') return 'row'
  if (semanticType === 'column') return 'column'
  if (semanticType === 'button') return 'button'
  if (
    hasTapInteraction(semantic) &&
    (
      semanticType === 'radio' ||
      semanticType === 'checkbox' ||
      semanticType === 'tab' ||
      semanticType === 'segmentedControl' ||
      semanticType === 'segmentedSelector' ||
      semanticType === 'segmentedOption' ||
      semanticType === 'datePicker' ||
      semanticType === 'timePicker' ||
      semanticType === 'pickerTrigger'
    )
  ) {
    return 'button'
  }
  if (semanticType === 'list') return 'list'
  if (semanticType === 'pageView') return 'pageView'
  if (semanticType === 'icon') return 'icon'
  if (semanticType === 'image') return 'image'
  if (semanticType === 'heading' || semanticType === 'label' || semanticType === 'buttonLabel' || semanticType === 'listItem' || semanticType === 'appBar') {
    return 'text'
  }

  if (uiType === 'TEXT') return 'text'
  if (uiType === 'ICON') return 'icon'
  if (uiType === 'SVG') return 'image'

  const imageFills = Array.isArray(specNode.fills)
    ? specNode.fills.some(function (fill) {
        return asRecord(fill)?.type === 'IMAGE'
      })
    : false
  if (uiType === 'RECTANGLE' && imageFills) return 'image'

  if (layoutMode === 'VERTICAL') return 'column'
  if (layoutMode === 'HORIZONTAL') return 'row'
  if (Array.isArray(specNode.children) && specNode.children.length > 0 && layoutMode === 'NONE') return 'stack'
  if (uiType === 'FRAME' || uiType === 'GROUP' || uiType === 'SECTION' || uiType === 'COMPONENT') return 'frame'
  if (uiType === 'RECTANGLE') return 'container'
  return 'frame'
}

function copyDefined(target, key, value) {
  if (typeof value !== 'undefined') {
    target[key] = value
  }
}

function extractNodeStyle(specNode) {
  const style = {}
  const numericKeys = [
    'x',
    'y',
    'width',
    'height',
    'rotation',
    'opacity',
    'cornerRadius',
    'itemSpacing',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft'
  ]
  for (const key of numericKeys) {
    if (typeof specNode[key] === 'number') {
      style[key] = specNode[key]
    }
  }
  const stringKeys = [
    'layoutMode',
    'layoutAlign',
    'layoutPositioning',
    'primaryAxisAlignItems',
    'counterAxisAlignItems',
    'blendMode',
    'textAlignHorizontal',
    'textAlignVertical',
    'textAutoResize'
  ]
  for (const key of stringKeys) {
    if (typeof specNode[key] === 'string' && specNode[key] !== '') {
      style[key] = specNode[key]
    }
  }
  if (typeof specNode.layoutGrow === 'number') {
    style.layoutGrow = specNode.layoutGrow
  }
  if (typeof specNode.visible === 'boolean') {
    style.visible = specNode.visible
  }
  if (typeof specNode.locked === 'boolean') {
    style.locked = specNode.locked
  }
  if (typeof specNode.clipsContent === 'boolean') {
    style.clipsContent = specNode.clipsContent
  }
  if (Array.isArray(specNode.cornerRadii)) {
    style.cornerRadii = cloneJson(specNode.cornerRadii)
  }
  if (Array.isArray(specNode.fills) && specNode.fills.length > 0) {
    style.fills = cloneJson(specNode.fills)
  }
  if (Array.isArray(specNode.strokes) && specNode.strokes.length > 0) {
    style.strokes = cloneJson(specNode.strokes)
  }
  if (Array.isArray(specNode.effects) && specNode.effects.length > 0) {
    style.effects = cloneJson(specNode.effects)
  }
  if (asRecord(specNode.constraints) !== null) {
    style.constraints = cloneJson(specNode.constraints)
  }
  return style
}

function extractDesignInstanceProps(specNode) {
  const meta = asRecord(specNode.meta)
  const instanceOf = asRecord(meta?.instanceOf)
  if (instanceOf === null) {
    return null
  }

  const designInstance = {}
  const componentId = asString(instanceOf.componentId).trim()
  const componentName = asString(instanceOf.componentName).trim()
  const componentDescription = asString(instanceOf.componentDescription).trim()
  const componentDescriptionMarkdown = asString(instanceOf.componentDescriptionMarkdown).trim()
  const componentSetId = asString(instanceOf.componentSetId).trim()
  const componentSetName = asString(instanceOf.componentSetName).trim()
  const componentSetDescription = asString(instanceOf.componentSetDescription).trim()
  const componentSetDescriptionMarkdown = asString(instanceOf.componentSetDescriptionMarkdown).trim()

  if (componentId !== '') {
    designInstance.componentId = componentId
  }
  if (componentName !== '') {
    designInstance.componentName = componentName
  }
  if (componentDescription !== '') {
    designInstance.componentDescription = componentDescription
  }
  if (componentDescriptionMarkdown !== '') {
    designInstance.componentDescriptionMarkdown = componentDescriptionMarkdown
  }
  if (componentSetId !== '') {
    designInstance.componentSetId = componentSetId
  }
  if (componentSetName !== '') {
    designInstance.componentSetName = componentSetName
  }
  if (componentSetDescription !== '') {
    designInstance.componentSetDescription = componentSetDescription
  }
  if (componentSetDescriptionMarkdown !== '') {
    designInstance.componentSetDescriptionMarkdown = componentSetDescriptionMarkdown
  }

  const variantProperties = asRecord(instanceOf.variantProperties)
  if (variantProperties !== null && Object.keys(variantProperties).length > 0) {
    designInstance.variantProperties = cloneJson(variantProperties)
  }

  if (Array.isArray(instanceOf.availableVariants) && instanceOf.availableVariants.length > 0) {
    designInstance.availableVariants = instanceOf.availableVariants
      .map(function (entry) {
        const record = asRecord(entry)
        if (record === null) {
          return null
        }
        const nextEntry = {}
        const entryComponentId = asString(record.componentId).trim()
        const entryComponentName = asString(record.componentName).trim()
        const entryComponentDescription = asString(record.componentDescription).trim()
        const entryComponentDescriptionMarkdown = asString(record.componentDescriptionMarkdown).trim()
        const entryVariantProperties = asRecord(record.variantProperties)
        if (entryComponentId !== '') {
          nextEntry.componentId = entryComponentId
        }
        if (entryComponentName !== '') {
          nextEntry.componentName = entryComponentName
        }
        if (entryComponentDescription !== '') {
          nextEntry.componentDescription = entryComponentDescription
        }
        if (entryComponentDescriptionMarkdown !== '') {
          nextEntry.componentDescriptionMarkdown = entryComponentDescriptionMarkdown
        }
        if (entryVariantProperties !== null && Object.keys(entryVariantProperties).length > 0) {
          nextEntry.variantProperties = cloneJson(entryVariantProperties)
        }
        return Object.keys(nextEntry).length > 0 ? nextEntry : null
      })
      .filter(Boolean)
  }

  if (variantProperties !== null) {
    const runtimeHints = {}
    for (const [rawKey, rawValue] of Object.entries(variantProperties)) {
      const key = normalizeVariantPropertyKey(rawKey)
      const value = asString(rawValue).trim()
      if (value === '') {
        continue
      }
      if ((key === 'state' || key === 'status') && typeof runtimeHints.state !== 'string') {
        runtimeHints.state = value
        continue
      }
      if ((key === 'kind' || key === 'role') && typeof runtimeHints.kind !== 'string') {
        runtimeHints.kind = value
      }
    }
    if (Object.keys(runtimeHints).length > 0) {
      designInstance.runtimeHints = runtimeHints
    }
  }

  return Object.keys(designInstance).length > 0 ? designInstance : null
}

function extractComponentVariants(specNode) {
  const componentVariants = asRecord(specNode.componentVariants)
  if (componentVariants === null) {
    return null
  }
  if (typeof componentVariants.currentVariant !== 'string' || componentVariants.currentVariant.trim() === '') {
    return null
  }
  const variants = asRecord(componentVariants.variants)
  if (variants === null || Object.keys(variants).length === 0) {
    return null
  }
  return cloneJson(componentVariants)
}

function extractNodeProps(specNode, semantic, componentRegistry) {
  const props = {}
  const semanticType = normalizeSemanticType(semantic?.type)
  if (typeof specNode.text === 'string') {
    props.text = specNode.text
  }
  const textKeys = [
    'fontFamily',
    'fontStyle',
    'fontSize',
    'fontWeight',
    'lineHeightPx',
    'letterSpacingPx',
    'textCase',
    'textDecoration'
  ]
  for (const key of textKeys) {
    copyDefined(props, key, specNode[key])
  }
  if (typeof specNode.svg === 'string' && specNode.svg !== '') {
    props.svg = specNode.svg
  }
  if (typeof specNode.svgUrl === 'string' && specNode.svgUrl !== '') {
    props.svgUrl = specNode.svgUrl
  }
  if (typeof specNode.color === 'string' && specNode.color !== '') {
    props.color = specNode.color
  }
  if (typeof specNode.pointCount === 'number') {
    props.pointCount = specNode.pointCount
  }
  if (typeof specNode.innerRadius === 'number') {
    props.innerRadius = specNode.innerRadius
  }
  if (asRecord(specNode.arcData) !== null) {
    props.arcData = cloneJson(specNode.arcData)
  }
  const componentRef = asRecord(semantic?.componentRef)
  const componentRootId = asString(componentRef?.id)
  if (componentRootId !== '') {
    props.componentRootId = componentRootId
    const componentMeta = componentRegistry.get(componentRootId)
    if (componentMeta) {
      props.componentRootName = componentMeta.name
      if (componentMeta.figmaNodeId !== '') {
        props.componentId = componentMeta.figmaNodeId
      }
    }
    if (typeof specNode.name === 'string' && specNode.name.trim() !== '') {
      props.componentName = specNode.name.trim()
    }
  }
  const assetRefs = Array.isArray(semantic?.assetRefs) ? semantic.assetRefs.filter(function (value) {
    return typeof value === 'string' && value.trim() !== ''
  }) : []
  if (assetRefs.length > 0) {
    props.assetRefs = assetRefs
  }
  const tokenRefs = asRecord(semantic?.tokenRefs)
  if (tokenRefs !== null) {
    props.tokenRefs = cloneJson(tokenRefs)
  }
  const designInstance = extractDesignInstanceProps(specNode)
  if (designInstance !== null) {
    props.designInstance = designInstance
  }
  const componentVariants = extractComponentVariants(specNode)
  if (componentVariants !== null) {
    props.componentVariants = componentVariants
  }
  const semanticProps = {}
  if (semanticType !== '') {
    semanticProps.type = semanticType
  }
  if (typeof semantic?.label === 'string' && semantic.label.trim() !== '') {
    semanticProps.label = semantic.label.trim()
  }
  if (typeof semantic?.notes === 'string' && semantic.notes.trim() !== '') {
    semanticProps.notes = semantic.notes.trim()
  }
  const semanticInteraction = asRecord(semantic?.interaction)
  const semanticOnTap = asRecord(semanticInteraction?.onTap)
  if (semanticOnTap !== null) {
    const onTapType = asString(semanticOnTap.type)
    if (onTapType !== '') {
      semanticProps.onTapType = onTapType
    }
    const onTapTo = asString(semanticOnTap.to)
    if (onTapTo !== '') {
      semanticProps.onTapTo = onTapTo
    }
    const onTapTargetId = asString(semanticOnTap.targetId)
    if (onTapTargetId !== '') {
      semanticProps.onTapTargetId = onTapTargetId
    }
  }
  const navigation = asRecord(semantic?.navigation)
  const navigationMode = asString(navigation?.mode)
  if (navigationMode !== '') {
    semanticProps.navigationMode = navigationMode
  }
  if (componentRootId !== '') {
    semanticProps.componentRefId = componentRootId
  }
  if (Object.keys(semanticProps).length > 0) {
    props.semantic = semanticProps
  }
  if (semanticType !== '') {
    props.semanticType = semanticType
  }
  return props
}

function extractInteraction(specNode, semantic, rootRegistry, targetVersion = '0.1') {
  const semanticInteraction = asRecord(semantic?.interaction)
  const semanticNavigation = asRecord(semantic?.navigation)
  const interaction = {}

  const onTap = asRecord(semanticInteraction?.onTap)
  if (onTap !== null) {
    const onTapType = asString(onTap.type)
    if (onTapType === 'navigate' || onTapType === 'openModal' || onTapType === 'none') {
      interaction.onTap = { type: onTapType }
      if (typeof onTap.to === 'string' && onTap.to.trim() !== '') {
        interaction.onTap.to = onTap.to.trim()
      }
      if (typeof onTap.targetId === 'string' && onTap.targetId.trim() !== '') {
        const targetMeta = rootRegistry.byId.get(onTap.targetId.trim())
        if (targetMeta?.role === 'screen' && typeof targetMeta.route === 'string' && targetMeta.route !== '') {
          interaction.onTap.to = targetMeta.route
        } else if (!interaction.onTap.to) {
          if (targetVersion === '0.2') {
            interaction.onTap.targetId = onTap.targetId.trim()
          } else {
            interaction.onTap.to = onTap.targetId.trim()
          }
        }
      }
    } else if (targetVersion === '0.2' && (onTapType === 'toggle' || onTapType === 'select' || onTapType === 'submit')) {
      interaction.onTap = { type: onTapType }
      if (typeof onTap.targetId === 'string' && onTap.targetId.trim() !== '') {
        interaction.onTap.targetId = onTap.targetId.trim()
      }
      if (typeof onTap.to === 'string' && onTap.to.trim() !== '') {
        interaction.onTap.to = onTap.to.trim()
      }
    } else if (onTapType === 'open_component') {
      const componentTargetId =
        (typeof onTap.targetId === 'string' && onTap.targetId.trim() !== '' ? onTap.targetId.trim() : '') ||
        asString(asRecord(semantic?.componentRef)?.id)
      if (targetVersion === '0.2') {
        interaction.onTap = { type: 'openComponent' }
        if (componentTargetId !== '') {
          interaction.onTap.targetId = componentTargetId
        }
      } else {
        interaction.onTap = { type: 'openModal' }
        if (componentTargetId !== '') {
          interaction.onTap.to = componentTargetId
        }
      }
    }
  }

  const navigationMode = asString(semanticNavigation?.mode)
  if (navigationMode === 'push' || navigationMode === 'replace' || navigationMode === 'reset') {
    interaction.navigation = { mode: navigationMode }
  }

  const scroll = asRecord(semanticInteraction?.scroll)
  if (scroll !== null) {
    const axis = asString(scroll.axis)
    const enabled = typeof scroll.enabled === 'boolean' ? scroll.enabled : axis !== ''
    if ((axis === 'vertical' || axis === 'horizontal') && enabled) {
      interaction.scroll = { enabled, axis }
    }
  }

  const gesture = asRecord(semanticInteraction?.gesture)
  if (gesture !== null) {
    const gestureType = asString(gesture.type)
    const axis = asString(gesture.axis)
    if ((gestureType === 'swipe' || gestureType === 'none') && (axis === 'vertical' || axis === 'horizontal' || axis === '')) {
      interaction.gesture = { type: gestureType }
      if (axis !== '') {
        interaction.gesture.axis = axis
      }
    }
  }

  const carousel = asRecord(semanticInteraction?.carousel)
  if (carousel !== null && typeof carousel.loop === 'boolean') {
    interaction.carousel = { loop: carousel.loop }
  }

  return Object.keys(interaction).length === 0 ? null : interaction
}

function extractNodeState(specNode) {
  const explicitState = asRecord(specNode.state)
  if (explicitState === null) {
    return null
  }
  const state = {}
  if (explicitState.selected === true) {
    state.selected = true
  }
  if (explicitState.checked === true) {
    state.checked = true
  }
  if (explicitState.default === true) {
    state.default = true
  }
  if (explicitState.active === true) {
    state.active = true
  }
  if (explicitState.disabled === true) {
    state.disabled = true
  }
  return Object.keys(state).length === 0 ? null : state
}

function extractNodeSemanticSnapshot(semantic) {
  const snapshot = {}
  const semanticType = normalizeSemanticType(semantic?.type)
  if (semanticType !== '') {
    snapshot.type = semanticType
  }
  const label = asString(semantic?.label)
  if (label !== '') {
    snapshot.label = label
  }
  const notes = asString(semantic?.notes)
  if (notes !== '') {
    snapshot.notes = notes
  }
  const componentRef = asRecord(semantic?.componentRef)
  const componentRefId = asString(componentRef?.id)
  if (componentRefId !== '') {
    snapshot.componentRefId = componentRefId
  }
  const tokenRefs = asRecord(semantic?.tokenRefs)
  if (tokenRefs !== null) {
    snapshot.tokenRefs = cloneJson(tokenRefs)
  }
  const assetRefs = Array.isArray(semantic?.assetRefs)
    ? semantic.assetRefs.filter(function (value) {
        return typeof value === 'string' && value.trim() !== ''
      })
    : []
  if (assetRefs.length > 0) {
    snapshot.assetRefs = assetRefs
  }
  return Object.keys(snapshot).length === 0 ? null : snapshot
}

function createRootRegistry(specDir) {
  const files = listJsonFilesRecursively()
  const byId = new Map()
  const byRoute = new Map()
  const byFile = new Map()
  for (const relativeFile of files) {
    const filePath = path.resolve(baseDir, relativeFile)
    try {
      const spec = parseJsonFile(filePath)
      validateRootSpec(spec)
      const semantic = asRecord(spec.semantic)
      const role = asString(semantic?.role)
      const id = asString(semantic?.id)
      if ((role === 'screen' || role === 'component') && id !== '') {
        const meta = {
          file: relativeFile,
          absoluteFile: filePath,
          spec,
          role,
          id,
          route: role === 'screen' ? asString(semantic?.route) : '',
          name:
            (role === 'component' && asString(asRecord(semantic?.component)?.name)) ||
            asString(semantic?.label) ||
            asString(spec.name) ||
            id,
          figmaNodeId: asString(asRecord(spec.meta)?.figmaNodeId)
        }
        byId.set(id, meta)
        byFile.set(relativeFile, meta)
        if (meta.route !== '') {
          byRoute.set(meta.route, meta)
        }
      }
    } catch (_error) {
      // Skip invalid or non-root documents while building the registry.
    }
  }
  return { byId, byRoute, byFile }
}

function collectReferencedRootIds(specNode, rootRegistry, resultSet) {
  const semantic = asRecord(specNode.semantic)
  const componentRef = asRecord(semantic?.componentRef)
  const componentId = asString(componentRef?.id)
  if (componentId !== '') {
    resultSet.add(componentId)
  }

  const interaction = asRecord(semantic?.interaction)
  const onTap = asRecord(interaction?.onTap)
  if (onTap !== null) {
    const tapType = asString(onTap.type)
    const targetId = asString(onTap.targetId)
    const route = asString(onTap.to)
    if (targetId !== '') {
      resultSet.add(targetId)
    } else if (tapType === 'navigate' && route !== '') {
      const routeTarget = rootRegistry.byRoute.get(route)
      if (routeTarget) {
        resultSet.add(routeTarget.id)
      }
    }
  }

  if (Array.isArray(specNode.children)) {
    for (const child of specNode.children) {
      collectReferencedRootIds(child, rootRegistry, resultSet)
    }
  }
}

function collectIncludedRoots(entryMeta, rootRegistry, options = {}) {
  const includeReferencedScreens = options?.includeReferencedScreens === true
  const includedIds = new Set([entryMeta.id])
  const queue = [entryMeta.id]
  while (queue.length > 0) {
    const currentId = queue.shift()
    const meta = rootRegistry.byId.get(currentId)
    if (!meta) {
      continue
    }
    const refs = new Set()
    collectReferencedRootIds(meta.spec, rootRegistry, refs)
    for (const refId of refs) {
      if (includedIds.has(refId)) {
        continue
      }
      const refMeta = rootRegistry.byId.get(refId)
      if (!refMeta) {
        continue
      }
      if (refMeta.role === 'screen' && includeReferencedScreens === false) {
        continue
      }
      includedIds.add(refId)
      queue.push(refId)
    }
  }
  return Array.from(includedIds).map(function (id) {
    return rootRegistry.byId.get(id)
  }).filter(Boolean)
}

function createNodeConverter(rootMeta, rootRegistry, interactionRefs, targetVersion = '0.1') {
  let fallbackCounter = 0
  function convertNode(specNode, pathLabel) {
    const semantic = asRecord(specNode.semantic)
    const nodeId =
      asString(semantic?.id) ||
      asString(asRecord(specNode.meta)?.figmaNodeId) ||
      sanitizeId(`${rootMeta.id}_${pathLabel}_${fallbackCounter += 1}`, `${rootMeta.id}_${fallbackCounter}`)
    const node = {
      id: nodeId,
      type: inferNodeType(specNode, targetVersion)
    }
    const semanticLabel = asString(semantic?.label)
    const name = asString(specNode.name)
    if (name !== '') {
      node.name = name
    } else if (semanticLabel !== '') {
      node.name = semanticLabel
    }
    const props = extractNodeProps(specNode, semantic, rootRegistry.byId)
    if (Object.keys(props).length > 0) {
      node.props = props
    }
    const style = extractNodeStyle(specNode)
    if (Object.keys(style).length > 0) {
      node.style = style
    }
    const notes = {}
    const metaNodeId = asString(asRecord(specNode.meta)?.figmaNodeId)
    const memo = joinMemoParts(buildSemanticMemoParts(specNode, semantic))
    if (memo !== '') {
      notes.memo = memo
    }
    if (metaNodeId !== '') {
      notes.sourceMetaNodeId = metaNodeId
    }
    if (rootMeta.role === 'screen' && pathLabel === 'root') {
      const flow = asRecord(semantic?.flow)
      if (typeof flow?.start === 'boolean') {
        notes.flowStart = flow.start
      }
      if (typeof flow?.id === 'string' && flow.id.trim() !== '') {
        notes.flowId = flow.id.trim()
      }
    }
    if (Object.keys(notes).length > 0) {
      node.notes = notes
    }
    const interaction = extractInteraction(specNode, semantic, rootRegistry, targetVersion)
    if (interaction !== null) {
      node.interaction = interaction
      interactionRefs.push({
        id: sanitizeId(`i_${nodeId}_${Object.keys(interaction).join('_')}`, `i_${nodeId}`),
        targetNodeId: nodeId,
        sourceRootId: rootMeta.id,
        sourceRootName: rootMeta.name,
        payload: cloneJson(interaction)
      })
    }
    if (targetVersion === '0.2') {
      const semanticSnapshot = extractNodeSemanticSnapshot(semantic)
      if (semanticSnapshot !== null) {
        node.semantic = semanticSnapshot
      }
      const state = extractNodeState(specNode)
      if (state !== null) {
        node.state = state
      }
    }
    if (Array.isArray(specNode.children) && specNode.children.length > 0) {
      node.children = specNode.children.map(function (child, index) {
        return convertNode(child, `${pathLabel}_${index + 1}`)
      })
    }
    return node
  }
  return convertNode
}

function createFlowGraphs(screenEntries, rootRegistry) {
  const flows = new Map()

  function ensureFlow(flowId) {
    if (!flows.has(flowId)) {
      flows.set(flowId, {
        id: flowId,
        name: flowId === 'main' ? 'Main Flow' : flowId,
        edges: []
      })
    }
    return flows.get(flowId)
  }

  for (const screenEntry of screenEntries) {
    const screenSemantic = asRecord(screenEntry.meta.spec.semantic)
    const flow = asRecord(screenSemantic?.flow)
    const flowId = asString(flow?.id) || 'main'
    const flowGraph = ensureFlow(flowId)
    if (flow?.start === true || typeof flowGraph.startScreenId !== 'string' || flowGraph.startScreenId === '') {
      flowGraph.startScreenId = screenEntry.id
    }

    function visit(node) {
      if (asRecord(node.interaction?.onTap)?.type === 'navigate') {
        const targetRoute = asString(node.interaction.onTap.to)
        const targetMeta = targetRoute === '' ? null : rootRegistry.byRoute.get(targetRoute)
        if (targetMeta?.role === 'screen') {
          flowGraph.edges.push({
            id: sanitizeId(`${screenEntry.id}__${targetMeta.id}__${node.id}__NAVIGATE`, `edge_${screenEntry.id}_${node.id}`),
            fromScreenId: screenEntry.id,
            toScreenId: targetMeta.id,
            triggerNodeId: node.id,
            navigation: 'NAVIGATE'
          })
        }
      }
      if (Array.isArray(node.children)) {
        for (const child of node.children) {
          visit(child)
        }
      }
    }

    visit(screenEntry.root)
  }

  return Array.from(flows.values()).filter(function (flow) {
    return flow.edges.length > 0 || typeof flow.startScreenId === 'string'
  })
}

function mergeTopLevelObjectRegistry(includedRoots, key) {
  const merged = {}
  for (const rootMeta of includedRoots) {
    const source = asRecord(rootMeta.spec[key])
    if (source === null) {
      continue
    }
    for (const [entryKey, entryValue] of Object.entries(source)) {
      merged[entryKey] = cloneJson(entryValue)
    }
  }
  return merged
}

function mergeTopLevelAssetRegistry(includedRoots) {
  const seen = new Set()
  const assets = []
  for (const rootMeta of includedRoots) {
    if (Array.isArray(rootMeta.spec.assets) === false) {
      continue
    }
    for (const asset of rootMeta.spec.assets) {
      const serialized = JSON.stringify(asset)
      if (seen.has(serialized)) {
        continue
      }
      seen.add(serialized)
      assets.push(cloneJson(asset))
    }
  }
  return assets
}

function convertUiSpecFileToFlutterIr(relativeFile, targetVersion = '0.1', options = {}) {
  const rootRegistry = createRootRegistry(uiSpecDir)
  const entryMeta = rootRegistry.byFile.get(relativeFile)
  if (!entryMeta) {
    throw new Error(`active ui_spec root not found or missing semantic.role/id: ${relativeFile}`)
  }

  const includedRoots = collectIncludedRoots(entryMeta, rootRegistry, options)
  const interactions = []
  const screens = []
  const components = []

  for (const rootMeta of includedRoots) {
    const convertNode = createNodeConverter(rootMeta, rootRegistry, interactions, targetVersion)
    const rootNode = convertNode(rootMeta.spec, 'root')
    const entry = {
      id: rootMeta.id,
      name: rootMeta.name,
      root: rootNode,
      meta: rootMeta
    }
    if (rootMeta.figmaNodeId !== '') {
      entry.figmaNodeId = rootMeta.figmaNodeId
    }
    if (rootMeta.role === 'screen') {
      if (rootMeta.route !== '') {
        entry.route = rootMeta.route
      }
      screens.push(entry)
    } else {
      components.push(entry)
    }
  }

  const flows = createFlowGraphs(screens, rootRegistry)

  const ir = {
    version: targetVersion,
    screens: screens.map(function ({ meta, ...rest }) {
      return rest
    }),
    components: components.map(function ({ meta, ...rest }) {
      return rest
    }),
    tokens: mergeTopLevelObjectRegistry(includedRoots, 'tokens'),
    interactions,
    flows,
    assets: mergeTopLevelAssetRegistry(includedRoots)
  }
  return { ir, entryId: entryMeta.id }
}

function buildDefaultIrOutputPath(entryId) {
  const now = new Date()
  const yyyy = String(now.getFullYear())
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const hh = String(now.getHours()).padStart(2, '0')
  const mi = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  const timestamp = `${yyyy}${mm}${dd}_${hh}${mi}${ss}`
  const outputRelative = path.join(irOutputRootArg, `${timestamp}_${entryId}.flutter_ir.json`)
  return assertPathInScope(path.resolve(baseDir, outputRelative), irOutputDir)
}

function resolveIrOutputPath(filePath) {
  if (typeof filePath !== 'string' || filePath.trim() === '') {
    throw new Error('IR output path is required')
  }
  const cleaned = filePath.trim()
  if (path.isAbsolute(cleaned)) {
    return assertPathInScope(cleaned, irOutputDir)
  }
  return assertPathInScope(path.resolve(baseDir, cleaned), irOutputDir)
}

function resolveSpecPathFromClient(filePath) {
  if (typeof filePath !== 'string' || filePath.trim() === '') {
    throw new Error('file path is required')
  }
  const cleaned = filePath.trim()
  if (path.isAbsolute(cleaned)) {
    return assertPathInScope(cleaned, uiSpecDir)
  }
  return assertPathInScope(path.resolve(baseDir, cleaned), uiSpecDir)
}

function ensureSpecFileExists(specPath) {
  if (fs.existsSync(specPath) === false) {
    fs.mkdirSync(path.dirname(specPath), { recursive: true })
    fs.writeFileSync(specPath, currentSpecText, 'utf8')
    console.warn(`[bridge-server] file created: ${specPath}`)
  }
}

function loadFromDiskAndBroadcast(source) {
  try {
    const text = fs.readFileSync(currentFilePath, 'utf8')
    const parsed = JSON.parse(text)
    validateRootSpec(parsed)
    currentSpecText = text
    currentRevision += 1
    const payload = createPayload('update')
    broadcast(payload)
    console.log(`[bridge-server] revision ${currentRevision} (${source}) -> ${currentFilePath}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error'
    console.error(`[bridge-server] invalid JSON in ${currentFilePath}: ${message}`)
  }
}

function watchCurrentFile() {
  if (watchedFilePath !== '') {
    fs.unwatchFile(watchedFilePath)
  }
  watchedFilePath = currentFilePath
  fs.watchFile(watchedFilePath, { interval: 300 }, function (current, previous) {
    if (current.mtimeMs === previous.mtimeMs) {
      return
    }
    loadFromDiskAndBroadcast('file-watch')
  })
}

function switchCurrentFile(filePath, source) {
  const resolved = resolveSpecPathFromClient(filePath)
  ensureSpecFileExists(resolved)
  currentFilePath = resolved
  watchCurrentFile()
  loadFromDiskAndBroadcast(source)
}

function listJsonFilesRecursively() {
  const results = []

  function visit(dirPath, depth) {
    if (depth > 8) {
      return
    }
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.git')) {
          continue
        }
        visit(fullPath, depth + 1)
        continue
      }
      if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
        results.push(path.relative(baseDir, fullPath))
      }
    }
  }

  if (fs.existsSync(uiSpecDir) === false) {
    fs.mkdirSync(uiSpecDir, { recursive: true })
  }
  visit(uiSpecDir, 0)
  results.sort(function (a, b) {
    return a.localeCompare(b)
  })
  return results
}

if (fs.existsSync(uiSpecDir) === false) {
  fs.mkdirSync(uiSpecDir, { recursive: true })
}
if (fs.existsSync(irOutputDir) === false) {
  fs.mkdirSync(irOutputDir, { recursive: true })
}

switchCurrentFile(initialFileArg, 'startup')

const server = http.createServer(function (req, res) {
  setCorsHeaders(res)

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`)

  if (req.method === 'GET' && url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(
      JSON.stringify({
        ok: true,
        revision: currentRevision,
        file: currentFilePath,
        fileRelative: path.relative(baseDir, currentFilePath),
        baseDir
      })
    )
    return
  }

  if (req.method === 'GET' && url.pathname === '/files') {
    try {
      const files = listJsonFilesRecursively()
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ ok: true, baseDir, files }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'list failed'
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ ok: false, error: message }))
    }
    return
  }

  if (req.method === 'POST' && url.pathname === '/watch') {
    let body = ''
    req.on('data', function (chunk) {
      body += chunk
      if (body.length > 100_000) {
        req.destroy()
      }
    })
    req.on('end', function () {
      try {
        const parsed = JSON.parse(body)
        const file = typeof parsed.file === 'string' ? parsed.file : ''
        switchCurrentFile(file, 'switch-file')
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
        res.end(
          JSON.stringify({
            ok: true,
            revision: currentRevision,
            file: currentFilePath,
            fileRelative: path.relative(baseDir, currentFilePath)
          })
        )
      } catch (error) {
        const message = error instanceof Error ? error.message : 'switch failed'
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ ok: false, error: message }))
      }
    })
    return
  }

  if (req.method === 'GET' && url.pathname === '/spec') {
    const requestedFile = url.searchParams.get('file')
    if (typeof requestedFile === 'string' && requestedFile.trim() !== '') {
      try {
        const resolved = resolveSpecPathFromClient(requestedFile)
        const payload = createFilePayload(resolved)
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify(payload))
      } catch (error) {
        const message = error instanceof Error ? error.message : 'spec read failed'
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ ok: false, error: message }))
      }
      return
    }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify(createPayload('snapshot')))
    return
  }

  if (req.method === 'POST' && url.pathname === '/spec') {
    let body = ''
    req.on('data', function (chunk) {
      body += chunk
      if (body.length > 5_000_000) {
        req.destroy()
      }
    })
    req.on('end', function () {
      try {
        const parsed = JSON.parse(body)
        const requestedFile =
          typeof parsed.file === 'string' && parsed.file.trim() !== ''
            ? parsed.file.trim()
            : null
        if (requestedFile !== null) {
          currentFilePath = resolveSpecPathFromClient(requestedFile)
          ensureSpecFileExists(currentFilePath)
          watchCurrentFile()
        }
        const nextSpec = typeof parsed.spec === 'undefined' ? parsed : parsed.spec
        validateRootSpec(nextSpec)
        const nextSpecText = JSON.stringify(nextSpec, null, 2)
        currentSpecText = nextSpecText
        currentRevision += 1
        fs.mkdirSync(path.dirname(currentFilePath), { recursive: true })
        fs.writeFileSync(currentFilePath, currentSpecText, 'utf8')
        const payload = createPayload('update')
        broadcast(payload)
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ ok: true, revision: currentRevision, fileRelative: path.relative(baseDir, currentFilePath) }))
      } catch (error) {
        const message = error instanceof Error ? error.message : 'invalid json'
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ ok: false, error: message }))
      }
    })
    return
  }

  if (req.method === 'POST' && url.pathname === '/export-ir') {
    let body = ''
    req.on('data', function (chunk) {
      body += chunk
      if (body.length > 2_000_000) {
        req.destroy()
      }
    })
    req.on('end', function () {
      try {
        const parsed = body.trim() === '' ? {} : JSON.parse(body)
        const requestedFile =
          typeof parsed.file === 'string' && parsed.file.trim() !== ''
            ? parsed.file.trim()
            : path.relative(baseDir, currentFilePath)
        const resolvedInput = resolveSpecPathFromClient(requestedFile)
        const inputRelative = path.relative(baseDir, resolvedInput)
        const requestedVersion =
          typeof parsed.version === 'string' && parsed.version.trim() !== ''
            ? parsed.version.trim()
            : '0.2'
        const includeReferencedScreens = parsed.includeReferencedScreens === true
        if (requestedVersion !== '0.1' && requestedVersion !== '0.2') {
          throw new Error(`unsupported IR version: ${requestedVersion}`)
        }
        const { ir, entryId } = convertUiSpecFileToFlutterIr(inputRelative, requestedVersion, {
          includeReferencedScreens
        })
        const resolvedOutput =
          typeof parsed.outputFile === 'string' && parsed.outputFile.trim() !== ''
            ? resolveIrOutputPath(parsed.outputFile)
            : buildDefaultIrOutputPath(entryId)
        fs.mkdirSync(path.dirname(resolvedOutput), { recursive: true })
        fs.writeFileSync(resolvedOutput, JSON.stringify(ir, null, 2), 'utf8')
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
        res.end(
          JSON.stringify({
            ok: true,
            file: inputRelative,
            outputFile: path.relative(baseDir, resolvedOutput),
            includeReferencedScreens,
            ir
          })
        )
      } catch (error) {
        const message = error instanceof Error ? error.message : 'export failed'
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ ok: false, error: message }))
      }
    })
    return
  }

  if (req.method === 'GET' && url.pathname === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    })
    sseClients.add(res)
    sendSseEvent(res, createPayload('snapshot'))

    req.on('close', function () {
      sseClients.delete(res)
    })
    return
  }

  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify({ ok: false, error: 'not found' }))
})

server.listen(port, '127.0.0.1', function () {
  console.log(`[bridge-server] listening on http://127.0.0.1:${port}`)
  console.log(`[bridge-server] base directory: ${baseDir}`)
  console.log(`[bridge-server] watching file: ${currentFilePath}`)
  console.log(`[bridge-server] ir output directory: ${irOutputDir}`)
})
