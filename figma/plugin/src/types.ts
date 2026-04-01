import { EventHandler } from '@create-figma-plugin/utilities'

export type RenderMode = 'session' | 'target'

export type ExportSourceMode = 'selection' | 'target'

export interface RenderUiSpecHandler extends EventHandler {
  name: 'RENDER_UI_SPEC'
  handler: (
    payload:
      | string
      | {
          jsonSpec: string
          focusViewport?: boolean
          renderMode?: RenderMode
          targetNodeId?: string
          sourceFile?: string
        }
  ) => void
}

export type UiPrefs = {
  syncUrl?: string
  selectedFile?: string
  renderMode?: RenderMode
  targetNodeId?: string
  targetNodeName?: string
  uiWidth?: number
  uiHeight?: number
}

export interface CloseHandler extends EventHandler {
  name: 'CLOSE'
  handler: () => void
}

export interface GetUiPrefsHandler extends EventHandler {
  name: 'GET_UI_PREFS'
  handler: () => void
}

export interface SetUiPrefsHandler extends EventHandler {
  name: 'SET_UI_PREFS'
  handler: (prefs: UiPrefs) => void
}

export interface ResizeUiWindowHandler extends EventHandler {
  name: 'RESIZE_UI_WINDOW'
  handler: (payload: {
    width: number
    height: number
  }) => void
}

export interface UseSelectedNodeAsTargetHandler extends EventHandler {
  name: 'USE_SELECTED_NODE_AS_TARGET'
  handler: () => void
}

export interface GetTargetNodeStatusHandler extends EventHandler {
  name: 'GET_TARGET_NODE_STATUS'
  handler: () => void
}

export interface PushSelectionToActiveFileHandler extends EventHandler {
  name: 'PUSH_SELECTION_TO_ACTIVE_FILE'
  handler: (payload: {
    activeFile: string
    baseSpec?: unknown
    destinationFile: string
    syncUrl: string
    sourceMode: ExportSourceMode
  }) => void
}

export interface TargetNodeStatusHandler extends EventHandler {
  name: 'TARGET_NODE_STATUS'
  handler: (status: {
    ok: boolean
    canExtract?: boolean
    nodeId?: string
    nodeName?: string
    sourceFile?: string
    message: string
  }) => void
}

export interface UiPrefsHandler extends EventHandler {
  name: 'UI_PREFS'
  handler: (prefs: UiPrefs) => void
}

export interface UiStatusHandler extends EventHandler {
  name: 'UI_STATUS'
  handler: (status: {
    kind: 'success' | 'error'
    message: string
  }) => void
}
