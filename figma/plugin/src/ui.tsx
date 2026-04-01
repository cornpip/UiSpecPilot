import {
  Button,
  Columns,
  Container,
  LoadingIndicator,
  Muted,
  render,
  Text,
  TextboxMultiline,
  VerticalSpace
} from '@create-figma-plugin/ui'
import { emit, on } from '@create-figma-plugin/utilities'
import { h } from 'preact'
import { useCallback, useEffect, useRef, useState } from 'preact/hooks'

import {
  CloseHandler,
  GetTargetNodeStatusHandler,
  GetUiPrefsHandler,
  PushSelectionToActiveFileHandler,
  ResizeUiWindowHandler,
  RenderMode,
  RenderUiSpecHandler,
  SetUiPrefsHandler,
  TargetNodeStatusHandler,
  UiPrefsHandler,
  UseSelectedNodeAsTargetHandler,
  UiStatusHandler
} from './types'

type SyncPayload = {
  file?: string
  spec?: unknown
}

type FilesPayload = {
  files?: Array<string>
}

type ExportIrResponse = {
  ok?: boolean
  outputFile?: string
  ir?: {
    screens?: Array<unknown>
    components?: Array<unknown>
    interactions?: Array<unknown>
    flows?: Array<unknown>
  }
  error?: string
}

type SemanticRole = '' | 'screen' | 'component'

type RootSemanticFormState = {
  id: string
  role: SemanticRole
  route: string
  flowId: string
  flowStart: boolean
  componentName: string
  label: string
  notes: string
}

type SpecRecord = Record<string, unknown>

const EMPTY_ROOT_SEMANTIC_FORM: RootSemanticFormState = {
  id: '',
  role: '',
  route: '',
  flowId: '',
  flowStart: false,
  componentName: '',
  label: '',
  notes: ''
}

const DEFAULT_WINDOW_SIZE = {
  width: 480,
  height: 640
} as const

const MIN_WINDOW_SIZE = {
  width: 360,
  height: 480
} as const

function specToText(spec: unknown): string {
  if (typeof spec === 'string') {
    return spec
  }
  return JSON.stringify(spec, null, 2)
}

function asRecord(value: unknown): SpecRecord | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null
  }
  return value as SpecRecord
}

function parseSpecObject(spec: unknown): SpecRecord | null {
  if (typeof spec === 'string') {
    try {
      return asRecord(JSON.parse(spec))
    } catch (_error) {
      return null
    }
  }
  return asRecord(spec)
}

function extractRootSemanticForm(spec: unknown): RootSemanticFormState {
  const specObject = parseSpecObject(spec)
  if (specObject === null) {
    return { ...EMPTY_ROOT_SEMANTIC_FORM }
  }

  const semantic = asRecord(specObject.semantic)
  const flow = semantic === null ? null : asRecord(semantic.flow)
  const component = semantic === null ? null : asRecord(semantic.component)
  const roleValue = semantic?.role
  const role: SemanticRole = roleValue === 'screen' || roleValue === 'component' ? roleValue : ''

  return {
    id: typeof semantic?.id === 'string' ? semantic.id : '',
    role,
    route: typeof semantic?.route === 'string' ? semantic.route : '',
    flowId: typeof flow?.id === 'string' ? flow.id : '',
    flowStart: typeof flow?.start === 'boolean' ? flow.start : false,
    componentName: typeof component?.name === 'string' ? component.name : '',
    label: typeof semantic?.label === 'string' ? semantic.label : '',
    notes: typeof semantic?.notes === 'string' ? semantic.notes : ''
  }
}

function buildRootSemanticPatch(form: RootSemanticFormState): SpecRecord | null {
  const semantic: SpecRecord = {}
  const id = form.id.trim()
  const route = form.route.trim()
  const flowId = form.flowId.trim()
  const componentName = form.componentName.trim()
  const label = form.label.trim()
  const notes = form.notes.trim()

  if (id !== '') {
    semantic.id = id
  }
  if (form.role !== '') {
    semantic.role = form.role
  }
  if (label !== '') {
    semantic.label = label
  }
  if (notes !== '') {
    semantic.notes = notes
  }
  if (form.role === 'screen') {
    if (route !== '') {
      semantic.route = route
    }
    if (flowId !== '' || form.flowStart) {
      const flow: SpecRecord = {}
      if (flowId !== '') {
        flow.id = flowId
      }
      if (form.flowStart) {
        flow.start = true
      }
      semantic.flow = flow
    }
  }
  if (form.role === 'component' && componentName !== '') {
    semantic.component = { name: componentName }
  }

  return Object.keys(semantic).length > 0 ? semantic : null
}

function applyRootSemanticForm(spec: unknown, form: RootSemanticFormState): SpecRecord {
  const specObject = parseSpecObject(spec)
  if (specObject === null) {
    throw new Error('active ui_spec JSON을 읽을 수 없습니다.')
  }
  const nextSpec: SpecRecord = { ...specObject }
  const semantic = buildRootSemanticPatch(form)
  if (semantic === null) {
    delete nextSpec.semantic
  } else {
    nextSpec.semantic = semantic
  }
  return nextSpec
}

function toDisplayFilePath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/')
  const marker = 'samples/'
  const markerIndex = normalized.indexOf(marker)
  if (markerIndex >= 0) {
    return normalized.slice(markerIndex)
  }
  return normalized
}

function makeLogLine(message: string): string {
  const now = new Date()
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  return `[${hh}:${mm}:${ss}] ${message}`
}


function clampWindowSize(width: number, height: number): { width: number; height: number } {
  return {
    width: Math.max(MIN_WINDOW_SIZE.width, Math.round(width)),
    height: Math.max(MIN_WINDOW_SIZE.height, Math.round(height))
  }
}

function Plugin() {
  const [statusMessage, setStatusMessage] = useState('')
  const [logLines, setLogLines] = useState<Array<string>>([])
  const [isRendering, setIsRendering] = useState(false)
  const [syncUrl, setSyncUrl] = useState('http://127.0.0.1:4311')
  const [syncStateText, setSyncStateText] = useState('disconnected')
  const [availableFiles, setAvailableFiles] = useState<Array<string>>([])
  const [selectedFile, setSelectedFile] = useState('')
  const [activeFile, setActiveFile] = useState('')
  const [targetNodeId, setTargetNodeId] = useState('')
  const [targetNodeName, setTargetNodeName] = useState('')
  const [targetNodeSourceFile, setTargetNodeSourceFile] = useState('')
  const [canExtractTarget, setCanExtractTarget] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const [prefsLoaded, setPrefsLoaded] = useState(false)
  const [activeSpec, setActiveSpec] = useState<unknown>(null)
  const [rootSemanticForm, setRootSemanticForm] = useState<RootSemanticFormState>({ ...EMPTY_ROOT_SEMANTIC_FORM })
  const [windowSize, setWindowSize] = useState<{ width: number; height: number }>({ ...DEFAULT_WINDOW_SIZE })
  const [windowWidthInput, setWindowWidthInput] = useState(String(DEFAULT_WINDOW_SIZE.width))
  const [windowHeightInput, setWindowHeightInput] = useState(String(DEFAULT_WINDOW_SIZE.height))
  const [isExportingIr, setIsExportingIr] = useState(false)
  const [lastExportedIrFile, setLastExportedIrFile] = useState('')
  const targetNodeIdRef = useRef('')
  const activeFileRef = useRef('')
  const logTextareaRef = useRef<HTMLTextAreaElement | null>(null)

  const appendLog = useCallback(function (message: string) {
    if (message.trim() === '') {
      return
    }
    setLogLines(function (prev) {
      const next = [...prev, makeLogLine(message)]
      if (next.length > 200) {
        return next.slice(next.length - 200)
      }
      return next
    })
  }, [])

  const updateStatus = useCallback(function (message: string) {
    setStatusMessage(message)
    appendLog(message)
  }, [appendLog])

  const persistPrefs = useCallback(function (next: {
    syncUrl?: string
    uiWidth?: number
    uiHeight?: number
  }) {
    emit<SetUiPrefsHandler>('SET_UI_PREFS', next)
  }, [])

  useEffect(function () {
    const offPrefs = on<UiPrefsHandler>('UI_PREFS', function (prefs) {
      if (typeof prefs.syncUrl === 'string' && prefs.syncUrl.trim() !== '') {
        setSyncUrl(prefs.syncUrl)
      }
      if (typeof prefs.selectedFile === 'string') {
        const nextSelectedFile = prefs.selectedFile
        setSelectedFile(nextSelectedFile)
        setActiveFile(function (prev) {
          if (prev !== '' && prev === nextSelectedFile) {
            return prev
          }
          return ''
        })
      }

      if (typeof prefs.uiWidth === 'number' && typeof prefs.uiHeight === 'number') {
        const nextWindowSize = clampWindowSize(prefs.uiWidth, prefs.uiHeight)
        setWindowSize(nextWindowSize)
        setWindowWidthInput(String(nextWindowSize.width))
        setWindowHeightInput(String(nextWindowSize.height))
      }
      setPrefsLoaded(true)
    })
    const offStatus = on<UiStatusHandler>('UI_STATUS', function (status) {
      setIsRendering(false)
      updateStatus(status.message)
    })
    const offTargetStatus = on<TargetNodeStatusHandler>('TARGET_NODE_STATUS', function (status) {
      updateStatus(status.message)
      setCanExtractTarget(status.canExtract === true)
      if (status.ok) {
        const nextNodeId = typeof status.nodeId === 'string' ? status.nodeId : ''
        const nextNodeName = typeof status.nodeName === 'string' ? status.nodeName : ''
        const nextSourceFile = typeof status.sourceFile === 'string' && status.sourceFile !== '' ? status.sourceFile : ''
        setTargetNodeId(nextNodeId)
        setTargetNodeName(nextNodeName)
        setTargetNodeSourceFile(nextSourceFile)
        if (nextSourceFile === '') {
          setSelectedFile('')
          setActiveFile('')
          setSessionReady(false)
        }
      }
    })

    emit<GetUiPrefsHandler>('GET_UI_PREFS')

    return function () {
      offPrefs()
      offStatus()
      offTargetStatus()
    }
  }, [persistPrefs, updateStatus])

  useEffect(function () {
    targetNodeIdRef.current = targetNodeId
  }, [targetNodeId])

  useEffect(function () {
    activeFileRef.current = activeFile
  }, [activeFile])

  useEffect(function () {
    if (prefsLoaded === false) {
      return
    }
    emit<GetTargetNodeStatusHandler>('GET_TARGET_NODE_STATUS')
  }, [prefsLoaded, targetNodeId])

  useEffect(function () {
    if (logTextareaRef.current === null) {
      return
    }
    logTextareaRef.current.scrollTop = logTextareaRef.current.scrollHeight
  }, [logLines])

  const renderSpec = useCallback(function (
    specText: string,
    focusViewport = true,
    options?: { background?: boolean; sourceFile?: string }
  ) {
    const currentTargetNodeId = targetNodeIdRef.current.trim()
    const currentRenderMode: RenderMode = currentTargetNodeId !== '' ? 'target' : 'session'
    if (options?.background !== true) {
      setIsRendering(true)
      updateStatus('Rendering...')
    }
    emit<RenderUiSpecHandler>('RENDER_UI_SPEC', {
      jsonSpec: specText,
      focusViewport,
      renderMode: currentRenderMode,
      targetNodeId: currentRenderMode === 'target' ? currentTargetNodeId : undefined,
      sourceFile: options?.sourceFile
    })
  }, [updateStatus])

  const applyRemoteSpec = useCallback(function (spec: unknown, source: string, focusViewport = false, sourceFile?: string) {
    try {
      const specText = specToText(spec)
      const parsed = JSON.parse(specText)
      setActiveSpec(parsed)
      setRootSemanticForm(extractRootSemanticForm(parsed))
      renderSpec(specText, focusViewport, { background: !focusViewport, sourceFile })
      updateStatus(`${source}: 적용 완료`)
    } catch (_error) {
      updateStatus(`${source}: JSON 파싱 실패`)
    }
  }, [renderSpec, updateStatus])

  const normalizeBaseUrl = useCallback(function () {
    return syncUrl.trim().replace(/\/+$/, '')
  }, [syncUrl])

  const fetchFilesFromServer = useCallback(async function (): Promise<Array<string>> {
    const base = normalizeBaseUrl()
    if (base === '') {
      throw new Error('Sync URL을 입력해 주세요.')
    }
    try {
      const response = await fetch(`${base}/files`)
      if (response.ok === false) {
        throw new Error(`HTTP ${response.status}`)
      }
      setSyncStateText('connected')
      const payload = (await response.json()) as FilesPayload
      return Array.isArray(payload.files) ? payload.files : []
    } catch (error) {
      setSyncStateText('disconnected')
      throw error
    }
  }, [normalizeBaseUrl])


  const fetchFileList = useCallback(async function () {
    setIsLoadingFiles(true)
    try {
      const files = await fetchFilesFromServer()
      setAvailableFiles(files)
      setSelectedFile(function (prev) {
        if (prev !== '' && files.includes(prev)) {
          return prev
        }
        return ''
      })

      setActiveFile(function (prev) {
        if (prev !== '' && files.includes(prev)) {
          return prev
        }
        return ''
      })
      setSessionReady(false)
      updateStatus(`파일 목록 로드 완료 (${files.length}개)`)
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'sync 서버 연결을 확인해 주세요.'
      updateStatus(`파일 목록 로드 실패: ${detail}`)
    } finally {
      setIsLoadingFiles(false)
    }
  }, [fetchFilesFromServer, updateStatus])

  const ensureWatchFile = useCallback(async function (file: string) {
    const base = normalizeBaseUrl()
    if (base === '') {
      updateStatus('Sync URL을 입력해 주세요.')
      return false
    }
    if (file.trim() === '') {
      updateStatus('선택된 파일이 없습니다.')
      return false
    }
    try {
      const response = await fetch(`${base}/watch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file })
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
      persistPrefs({ syncUrl: base })
      setSyncStateText('connected')
      setActiveFile(file)
      return true
    } catch (error) {
      setSyncStateText('disconnected')
      const detail = error instanceof Error ? error.message : 'unknown error'
      updateStatus(`watch 파일 전환 실패: ${detail}`)
      return false
    }
  }, [normalizeBaseUrl, persistPrefs, updateStatus])

  const handleSetActiveFileClick = useCallback(async function () {
    const base = normalizeBaseUrl()
    if (base === '') {
      updateStatus('Sync URL을 입력해 주세요.')
      return
    }
    const file = selectedFile.trim()
    if (file === '') {
      updateStatus('먼저 파일을 선택해 주세요.')
      return
    }
    const switched = await ensureWatchFile(file)
    if (switched) {
      try {
        const response = await fetch(`${base}/spec`)
        if (response.ok === false) {
          throw new Error(`HTTP ${response.status}`)
        }
        setSyncStateText('connected')
        const payload = (await response.json()) as SyncPayload
        if (typeof payload.file === 'string' && payload.file.trim() !== '') {
          setSelectedFile(payload.file)
          setActiveFile(payload.file)
        }
        applyRemoteSpec(payload.spec, 'set active file', true, file)
        setSessionReady(true)
      } catch (_error) {
        setSyncStateText('disconnected')
        setSessionReady(false)
        updateStatus('활성 파일은 설정됐지만 초기 렌더(fetch /spec)에 실패했습니다.')
      }
    }
  }, [normalizeBaseUrl, selectedFile, ensureWatchFile, applyRemoteSpec, updateStatus])


  const handleSelectFileChange = useCallback(function (event: Event) {
    const target = event.target as HTMLSelectElement
    const value = target.value
    setSelectedFile(value)
    if (activeFile !== value) {
      setActiveFile('')
      setSessionReady(false)
    }
  }, [activeFile])


  const handleRootSemanticInput = useCallback(function (
    key: keyof RootSemanticFormState,
    value: string | boolean
  ) {
    setRootSemanticForm(function (prev) {
      return {
        ...prev,
        [key]: value
      }
    })
  }, [])

  const handleResetRootSemanticClick = useCallback(function () {
    setRootSemanticForm(extractRootSemanticForm(activeSpec))
    updateStatus('Semantic form을 active file 기준으로 되돌렸습니다.')
  }, [activeSpec, updateStatus])

  const handleApplyRootSemanticClick = useCallback(async function () {
    const base = normalizeBaseUrl()
    const file = activeFile.trim()
    if (base === '') {
      updateStatus('Sync URL을 입력해 주세요.')
      return
    }
    if (file === '') {
      updateStatus('Set Active File을 먼저 실행해 주세요.')
      return
    }

    const nextId = rootSemanticForm.id.trim()
    if (nextId === '') {
      updateStatus('Root semantic id를 입력해 주세요.')
      return
    }
    if (rootSemanticForm.role === '') {
      updateStatus('Root semantic role을 선택해 주세요.')
      return
    }
    if (rootSemanticForm.role === 'screen' && rootSemanticForm.route.trim() === '') {
      updateStatus('screen role에는 route를 입력해 주세요.')
      return
    }
    if (rootSemanticForm.role === 'component' && rootSemanticForm.componentName.trim() === '') {
      updateStatus('component role에는 component name을 입력해 주세요.')
      return
    }
    if (activeSpec === null) {
      updateStatus('Active spec이 아직 로드되지 않았습니다.')
      return
    }

    try {
      const nextSpec = applyRootSemanticForm(activeSpec, rootSemanticForm)
      const response = await fetch(`${base}/spec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          file,
          spec: nextSpec
        })
      })
      if (response.ok === false) {
        throw new Error(`HTTP ${response.status}`)
      }
      setActiveSpec(nextSpec)
      setRootSemanticForm(extractRootSemanticForm(nextSpec))
      updateStatus('Root semantic 변경사항을 active file에 저장했습니다.')
      setSyncStateText('connected')
      updateStatus('Root semantic 저장 완료 (semantic-only 변경은 현재 캔버스에 즉시 보이지 않을 수 있습니다).')
    } catch (error) {
      setSyncStateText('disconnected')
      const detail = error instanceof Error ? error.message : 'unknown error'
      updateStatus(`Root semantic 저장 실패: ${detail}`)
    }
  }, [normalizeBaseUrl, activeFile, rootSemanticForm, activeSpec, updateStatus])

  const handleUseSelectedNodeAsTargetClick = useCallback(function () {
    emit<UseSelectedNodeAsTargetHandler>('USE_SELECTED_NODE_AS_TARGET')
  }, [])

  const handleClearTargetNodeClick = useCallback(function () {
    setTargetNodeId('')
    setTargetNodeName('')
    setCanExtractTarget(false)
    setSessionReady(false)
    emit<SetUiPrefsHandler>('SET_UI_PREFS', {
      targetNodeId: '',
      targetNodeName: ''
    })
    updateStatus('Target node 해제됨 (session mode)')
  }, [updateStatus])

  const handlePushFigmaChangesClick = useCallback(function () {
    const base = normalizeBaseUrl()
    const file = activeFile.trim()
    if (base === '') {
      updateStatus('Sync URL을 입력해 주세요.')
      return
    }
    if (file === '') {
      updateStatus('Set Active File을 먼저 실행해 주세요.')
      return
    }
    if (activeSpec === null) {
      updateStatus('Active spec이 아직 로드되지 않았습니다.')
      return
    }
    if (targetNodeId.trim() === '') {
      updateStatus('Use Selected Node as Target으로 대상 노드를 먼저 설정해 주세요.')
      return
    }
    if (canExtractTarget === false) {
      updateStatus('현재 target node는 plugin이 생성한 root node가 아니어서 Extract to ui_spec를 사용할 수 없습니다.')
      return
    }
    updateStatus('Figma에서 active ui_spec를 업데이트 중...')
    emit<PushSelectionToActiveFileHandler>('PUSH_SELECTION_TO_ACTIVE_FILE', {
      activeFile: file,
      baseSpec: activeSpec,
      destinationFile: file,
      syncUrl: base,
      sourceMode: 'target'
    })
  }, [normalizeBaseUrl, activeFile, activeSpec, targetNodeId, canExtractTarget, updateStatus])


  const handleExportActiveFileToIrClick = useCallback(async function () {
    const base = normalizeBaseUrl()
    const file = activeFile.trim() !== '' ? activeFile.trim() : targetNodeSourceFile.trim()
    if (base === '') {
      updateStatus('Sync URL을 입력해 주세요.')
      return
    }
    if (file === '') {
      updateStatus('Set Active File을 먼저 실행해 주세요.')
      return
    }
    setIsExportingIr(true)
    try {
      const response = await fetch(`${base}/export-ir`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ file })
      })
      const payload = (await response.json()) as ExportIrResponse
      if (response.ok === false || payload.ok === false) {
        throw new Error(typeof payload.error === 'string' && payload.error.trim() !== '' ? payload.error : `HTTP ${response.status}`)
      }
      setSyncStateText('connected')
      setLastExportedIrFile(typeof payload.outputFile === 'string' ? payload.outputFile : '')
      updateStatus(`Flutter IR export 완료: ${typeof payload.outputFile === 'string' ? toDisplayFilePath(payload.outputFile) : 'output path unavailable'}`)
    } catch (error) {
      setSyncStateText('disconnected')
      const detail = error instanceof Error ? error.message : 'unknown error'
      updateStatus(`Flutter IR export 실패: ${detail}`)
    } finally {
      setIsExportingIr(false)
    }
  }, [normalizeBaseUrl, activeFile, targetNodeSourceFile, updateStatus])

  useEffect(function () {
    if (prefsLoaded === false) {
      return
    }
    const timer = window.setTimeout(function () {
      fetchFileList().catch(function () {
        updateStatus('초기 파일 목록 로드 실패')
      })
    }, 50)
    return function () {
      window.clearTimeout(timer)
    }
  }, [prefsLoaded, fetchFileList, updateStatus])

  useEffect(function () {
    const file = targetNodeSourceFile.trim()
    if (file === '' || prefsLoaded === false) {
      return
    }
    if (activeFileRef.current === file) {
      return
    }
    async function autoActivate() {
      const base = normalizeBaseUrl()
      if (base === '') {
        return
      }
      const files = await fetchFilesFromServer()
      setAvailableFiles(files)
      if (!files.includes(file)) {
        setSelectedFile('')
        setActiveFile('')
        setSessionReady(false)
        updateStatus(`노드 소스 파일을 찾을 수 없음 (비활성화): ${file}`)
        return
      }
      setSelectedFile(file)
      const switched = await ensureWatchFile(file)
      if (switched) {
        try {
          const response = await fetch(`${base}/spec`)
          if (response.ok === false) {
            throw new Error(`HTTP ${response.status}`)
          }
          const payload = (await response.json()) as SyncPayload
          if (typeof payload.file === 'string' && payload.file.trim() !== '') {
            setSelectedFile(payload.file)
            setActiveFile(payload.file)
          }
          applyRemoteSpec(payload.spec, 'use selected (auto)', true, file)
          setSessionReady(true)
        } catch (_error) {
          setSessionReady(false)
          updateStatus('소스 파일 활성화됐지만 초기 렌더 실패')
        }
      }
    }
    autoActivate().catch(function () {
      updateStatus('노드 소스 파일 자동 활성화 실패')
    })
  }, [targetNodeSourceFile, prefsLoaded, normalizeBaseUrl, fetchFilesFromServer, setAvailableFiles, ensureWatchFile, applyRemoteSpec, updateStatus])

  const handleCloseButtonClick = useCallback(function () {
    emit<CloseHandler>('CLOSE')
  }, [])

  const resizeWindow = useCallback(function (width: number, height: number) {
    const next = clampWindowSize(width, height)
    setWindowSize(next)
    setWindowWidthInput(String(next.width))
    setWindowHeightInput(String(next.height))
    emit<ResizeUiWindowHandler>('RESIZE_UI_WINDOW', next)
  }, [])

  const handleResetWindowClick = useCallback(function () {
    resizeWindow(DEFAULT_WINDOW_SIZE.width, DEFAULT_WINDOW_SIZE.height)
  }, [resizeWindow])

  const handleApplyWindowSizeClick = useCallback(function () {
    const parsedWidth = Number(windowWidthInput.trim())
    const parsedHeight = Number(windowHeightInput.trim())
    resizeWindow(parsedWidth, parsedHeight)
  }, [resizeWindow, windowHeightInput, windowWidthInput])

  const sectionStyle = {
    border: '1px solid #e3e5e8',
    borderRadius: '8px',
    padding: '10px',
    background: '#fafbfc'
  } as const

  return (
    <Container space="medium">
      <VerticalSpace space="small" />
      <div style={sectionStyle}>
        <Text>Window Size</Text>
        <VerticalSpace space="medium" />
        <Columns space="extraSmall">
          <div style={{ flex: 1 }}>
            <Text>
              <Muted>Width</Muted>
            </Text>
            <TextboxMultiline
              onValueInput={setWindowWidthInput}
              rows={1}
              value={windowWidthInput}
            />
          </div>
          <div style={{ flex: 1 }}>
            <Text>
              <Muted>Height</Muted>
            </Text>
            <TextboxMultiline
              onValueInput={setWindowHeightInput}
              rows={1}
              value={windowHeightInput}
            />
          </div>
        </Columns>
        <VerticalSpace space="extraSmall" />
        <Columns space="extraSmall">
          <Button fullWidth onClick={handleApplyWindowSizeClick} secondary>
            Apply
          </Button>
          <Button fullWidth onClick={handleResetWindowClick} secondary>
            Default
          </Button>
        </Columns>
        <VerticalSpace space="extraSmall" />
        <Text>
          <Muted>{`Current: ${windowSize.width} x ${windowSize.height} | Min: ${MIN_WINDOW_SIZE.width} x ${MIN_WINDOW_SIZE.height}`}</Muted>
        </Text>
      </div>
      <VerticalSpace space="small" />
      <div style={sectionStyle}>
        <Text>Server State</Text>
        <VerticalSpace space="medium" />
        <Text>
          <Muted>{`${syncUrl.trim() === '' ? '(empty url)' : syncUrl.trim()} (${syncStateText})`}</Muted>
        </Text>
      </div>
      <VerticalSpace space="small" />
      <div style={sectionStyle}>
        <Text>UI Spec</Text>
        <VerticalSpace space="medium" />
        <Text>
          <Muted>{`Target Node: ${targetNodeId.trim() === '' ? 'New Session Node' : `${targetNodeName} (${targetNodeId})`}`}</Muted>
        </Text>
        <VerticalSpace space="extraSmall" />
        <Columns space="extraSmall">
          <Button
            disabled={isRendering || isLoadingFiles}
            fullWidth
            onClick={handleUseSelectedNodeAsTargetClick}
            secondary
          >
            Use Selected Node as Target
          </Button>
          <Button
            disabled={isRendering || isLoadingFiles || targetNodeId.trim() === ''}
            onClick={handleClearTargetNodeClick}
            secondary
          >
            ×
          </Button>
        </Columns>
        <VerticalSpace space="small" />

        <Text>
          <Muted>Select ui_spec</Muted>
        </Text>
        <VerticalSpace space="extraSmall" />
        <select onChange={handleSelectFileChange} style={{ width: '100%' }} value={selectedFile}>
          <option value="">(none)</option>
          {availableFiles.length === 0 ? (
            <option disabled value="__no_files__">
              (ui_spec/samples/*.json not found)
            </option>
          ) : (
            availableFiles.map(function (filePath) {
              return (
                <option key={filePath} value={filePath}>
                  {toDisplayFilePath(filePath)}
                </option>
              )
            })
          )}
        </select>
        <VerticalSpace space="extraSmall" />
        <Columns space="extraSmall">
          <Button disabled={isRendering || isLoadingFiles} fullWidth onClick={fetchFileList} secondary>
            Refresh Files
          </Button>
          <Button
            disabled={isRendering || isLoadingFiles || selectedFile.trim() === ''}
            fullWidth
            onClick={handleSetActiveFileClick}
            secondary
          >
            Set Active File
          </Button>
        </Columns>
        <VerticalSpace space="extraSmall" />
        <Text>
          <Muted>{`Active File: ${activeFile === '' ? '(not set)' : toDisplayFilePath(activeFile)}`}</Muted>
        </Text>
      </div>
      <VerticalSpace space="small" />
      <div style={sectionStyle}>
        <Text>Semantic Editor (Root)</Text>
        <VerticalSpace space="medium" />
        <Text>
          <Muted>Root ID</Muted>
        </Text>
        <TextboxMultiline
          onValueInput={function (value) {
            handleRootSemanticInput('id', value)
          }}
          rows={1}
          value={rootSemanticForm.id}
        />
        <VerticalSpace space="extraSmall" />
        <Text>
          <Muted>Role</Muted>
        </Text>
        <select
          onChange={function (event) {
            handleRootSemanticInput('role', (event.target as HTMLSelectElement).value)
          }}
          style={{ width: '100%' }}
          value={rootSemanticForm.role}
        >
          <option value="">(select role)</option>
          <option value="screen">screen</option>
          <option value="component">component</option>
        </select>
        {rootSemanticForm.role === 'screen' ? (
          <div>
            <VerticalSpace space="extraSmall" />
            <Text>
              <Muted>Route</Muted>
            </Text>
            <TextboxMultiline
              onValueInput={function (value) {
                handleRootSemanticInput('route', value)
              }}
              rows={1}
              value={rootSemanticForm.route}
            />
            <VerticalSpace space="extraSmall" />
            <Text>
              <Muted>Flow ID</Muted>
            </Text>
            <TextboxMultiline
              onValueInput={function (value) {
                handleRootSemanticInput('flowId', value)
              }}
              rows={1}
              value={rootSemanticForm.flowId}
            />
            <VerticalSpace space="extraSmall" />
            <label style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px' }}>
              <input
                checked={rootSemanticForm.flowStart}
                onChange={function (event) {
                  handleRootSemanticInput('flowStart', (event.target as HTMLInputElement).checked)
                }}
                type="checkbox"
              />
              <span>Flow Start</span>
            </label>
          </div>
        ) : null}
        {rootSemanticForm.role === 'component' ? (
          <div>
            <VerticalSpace space="extraSmall" />
            <Text>
              <Muted>Component Name</Muted>
            </Text>
            <TextboxMultiline
              onValueInput={function (value) {
                handleRootSemanticInput('componentName', value)
              }}
              rows={1}
              value={rootSemanticForm.componentName}
            />
          </div>
        ) : null}
        <VerticalSpace space="extraSmall" />
        <Text>
          <Muted>Label</Muted>
        </Text>
        <TextboxMultiline
          onValueInput={function (value) {
            handleRootSemanticInput('label', value)
          }}
          rows={1}
          value={rootSemanticForm.label}
        />
        <VerticalSpace space="extraSmall" />
        <Text>
          <Muted>Notes</Muted>
        </Text>
        <TextboxMultiline
          onValueInput={function (value) {
            handleRootSemanticInput('notes', value)
          }}
          rows={3}
          value={rootSemanticForm.notes}
        />
        <VerticalSpace space="extraSmall" />
        <Columns space="extraSmall">
          <Button
            disabled={activeFile.trim() === ''}
            fullWidth
            onClick={handleApplyRootSemanticClick}
            secondary
          >
            Apply Root Semantic
          </Button>
          <Button
            disabled={activeFile.trim() === ''}
            fullWidth
            onClick={handleResetRootSemanticClick}
            secondary
          >
            Reset
          </Button>
        </Columns>
      </div>
      <VerticalSpace space="small" />
      <div style={sectionStyle}>
        <Text>Update UI Spec</Text>
        <VerticalSpace space="medium" />
        <Button
          disabled={
            isRendering ||
            isLoadingFiles ||
            activeFile.trim() === '' ||
            targetNodeId.trim() === '' ||
            canExtractTarget === false
          }
          fullWidth
          onClick={handlePushFigmaChangesClick}
          secondary
        >
          Update Active ui_spec
        </Button>
      </div>
      <VerticalSpace space="small" />
      <div style={sectionStyle}>
        <Text>Export Active File to Flutter IR</Text>
        <VerticalSpace space="medium" />
        <Button
          disabled={
            isRendering ||
            isLoadingFiles ||
            isExportingIr ||
            (activeFile.trim() === '' && targetNodeSourceFile.trim() === '') ||
            sessionReady === false
          }
          fullWidth
          onClick={handleExportActiveFileToIrClick}
          secondary
        >
          {isExportingIr ? 'Exporting...' : 'Export Active File to Flutter IR'}
        </Button>
        <VerticalSpace space="extraSmall" />
        <Text>
          <Muted>{`IR Output: ${lastExportedIrFile === '' ? '(not exported yet)' : lastExportedIrFile}`}</Muted>
        </Text>
      </div>
      <VerticalSpace space="small" />
      <Button disabled={isRendering} fullWidth onClick={handleCloseButtonClick} secondary>
        Close
      </Button>
      <VerticalSpace space="extraSmall" />
      {isRendering ? <LoadingIndicator /> : null}

      {statusMessage !== '' ? (
        <div>
          <VerticalSpace space="extraSmall" />
          <Text>
            <Muted>{statusMessage}</Muted>
          </Text>
        </div>
      ) : null}
      <VerticalSpace space="small" />
      <div style={sectionStyle}>
        <Text>Logs</Text>
        <VerticalSpace space="medium" />
        <textarea
          readOnly
          ref={logTextareaRef}
          spellcheck={false}
          style={{
            width: '100%',
            minHeight: '180px',
            maxHeight: '180px',
            resize: 'none',
            overflowY: 'auto',
            boxSizing: 'border-box',
            userSelect: 'text',
            WebkitUserSelect: 'text',
            whiteSpace: 'pre-wrap',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            fontSize: '11px',
            lineHeight: '1.45',
            padding: '10px',
            border: '1px solid #d7dbe0',
            borderRadius: '6px',
            background: '#ffffff',
            color: '#1f2328'
          }}
          value={logLines.join('\n')}
        />
      </div>
    </Container>
  )
}

export default render(Plugin)
