/**
 * Ocarina's deliberately inert extension seam.
 *
 * This module only describes data and callback contracts. It does not discover,
 * load, or start integrations. Future OpenTab and OMO adapters can contribute
 * through this boundary without becoming dependencies of the TUI.
 */

export type ExtensionContext = Readonly<Record<string, unknown>>
export type ExtensionValue = unknown
export type ExtensionHandler = (context: ExtensionContext) => ExtensionValue | Promise<ExtensionValue>

export interface CommandContribution {
  readonly id: string
  readonly command: string
  readonly description?: string
  readonly execute?: ExtensionHandler
}

export interface SidebarContribution {
  readonly id: string
  readonly label: string
  readonly render?: ExtensionHandler
}

export interface DialogContribution {
  readonly id: string
  readonly title?: string
  readonly open?: ExtensionHandler
}

export interface ToolRendererContribution {
  readonly id: string
  readonly tool: string
  readonly render?: ExtensionHandler
}

export interface TaskProvider {
  readonly id: string
  readonly provide?: ExtensionHandler
}

export interface StudyContextProvider {
  readonly id: string
  readonly provide?: ExtensionHandler
}

export interface IntegrationRegistry {
  readonly commands: readonly CommandContribution[]
  readonly sidebars: readonly SidebarContribution[]
  readonly dialogs: readonly DialogContribution[]
  readonly toolRenderers: readonly ToolRendererContribution[]
  readonly taskProviders: readonly TaskProvider[]
  readonly studyContextProviders: readonly StudyContextProvider[]
}

export type IntegrationRegistryInput = {
  readonly commands?: readonly CommandContribution[]
  readonly sidebars?: readonly SidebarContribution[]
  readonly dialogs?: readonly DialogContribution[]
  readonly toolRenderers?: readonly ToolRendererContribution[]
  readonly taskProviders?: readonly TaskProvider[]
  readonly studyContextProviders?: readonly StudyContextProvider[]
}

/**
 * Creates a registry snapshot. Calling this with no input is the supported
 * Phase F empty registry and has no runtime effect beyond allocating arrays.
 * Input arrays are copied so creating a registry never mutates its caller.
 */
export function createIntegrationRegistry(input: IntegrationRegistryInput = {}): IntegrationRegistry {
  return Object.freeze({
    commands: copyList(input.commands),
    sidebars: copyList(input.sidebars),
    dialogs: copyList(input.dialogs),
    toolRenderers: copyList(input.toolRenderers),
    taskProviders: copyList(input.taskProviders),
    studyContextProviders: copyList(input.studyContextProviders),
  })
}

/** A shared, immutable empty value for hosts that do not enable integrations. */
export const emptyIntegrationRegistry: IntegrationRegistry = createIntegrationRegistry()

function copyList<T>(items: readonly T[] | undefined): readonly T[] {
  return Object.freeze([...(items ?? [])])
}
