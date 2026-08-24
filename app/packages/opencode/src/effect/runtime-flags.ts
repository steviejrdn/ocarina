import { Config, ConfigProvider, Context, Effect, Layer, Option } from "effect"
import { ConfigService } from "@/effect/config-service"
import { Flag } from "@opencode-ai/core/flag/flag"

const ocarinaMode = !Flag.OCARINA_TRUSTED_TEST

const bool = (name: string, defaultValue = false) => Config.boolean(name).pipe(Config.withDefault(defaultValue))
const positiveInteger = (name: string) =>
  Config.number(name).pipe(
    Config.map((value) => (Number.isInteger(value) && value > 0 ? value : undefined)),
    Config.orElse(() => Config.succeed(undefined)),
  )
const experimental = bool("OPENCODE_EXPERIMENTAL")
const enabledByExperimental = (name: string) =>
  Config.all({ experimental, enabled: Config.boolean(name).pipe(Config.option) }).pipe(
    Config.map((flags) => Option.getOrElse(flags.enabled, () => flags.experimental)),
  )

export class Service extends ConfigService.Service<Service>()("@opencode/RuntimeFlags", {
  autoShare: ocarinaMode ? Config.succeed(false) : bool("OPENCODE_AUTO_SHARE"),
  // Pure mode is an intrinsic Ocarina invariant, including trusted test
  // runtimes. It is not an overrideable OpenCode compatibility flag.
  pure: Config.succeed(true),
  disableDefaultPlugins: bool("OPENCODE_DISABLE_DEFAULT_PLUGINS"),
  disableEmbeddedWebUi: bool("OPENCODE_DISABLE_EMBEDDED_WEB_UI"),
  disableExternalSkills: ocarinaMode ? Config.succeed(true) : bool("OPENCODE_DISABLE_EXTERNAL_SKILLS"),
  disableLspDownload: ocarinaMode ? Config.succeed(true) : bool("OPENCODE_DISABLE_LSP_DOWNLOAD"),
  disableClaudeCodePrompt: ocarinaMode
    ? Config.succeed(true)
    : Config.all({
        broad: bool("OPENCODE_DISABLE_CLAUDE_CODE"),
        direct: bool("OPENCODE_DISABLE_CLAUDE_CODE_PROMPT"),
      }).pipe(Config.map((flags) => flags.broad || flags.direct)),
  disableClaudeCodeSkills: ocarinaMode
    ? Config.succeed(true)
    : Config.all({
        broad: bool("OPENCODE_DISABLE_CLAUDE_CODE"),
        direct: bool("OPENCODE_DISABLE_CLAUDE_CODE_SKILLS"),
      }).pipe(Config.map((flags) => flags.broad || flags.direct)),
  enableExa: ocarinaMode
    ? Config.succeed(false)
    : Config.all({
        experimental,
        enabled: bool("OPENCODE_ENABLE_EXA"),
        legacy: bool("OPENCODE_EXPERIMENTAL_EXA"),
      }).pipe(Config.map((flags) => flags.experimental || flags.enabled || flags.legacy)),
  enableParallel: ocarinaMode
    ? Config.succeed(false)
    : Config.all({
        enabled: bool("OPENCODE_ENABLE_PARALLEL"),
        legacy: bool("OPENCODE_EXPERIMENTAL_PARALLEL"),
      }).pipe(Config.map((flags) => flags.enabled || flags.legacy)),
  enableExperimentalModels: ocarinaMode ? Config.succeed(false) : bool("OPENCODE_ENABLE_EXPERIMENTAL_MODELS"),
  enableQuestionTool: bool("OPENCODE_ENABLE_QUESTION_TOOL"),
  experimentalReferences: ocarinaMode
    ? Config.succeed(false)
    : enabledByExperimental("OPENCODE_EXPERIMENTAL_REFERENCES"),
  experimentalBackgroundSubagents: ocarinaMode
    ? Config.succeed(false)
    : enabledByExperimental("OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS"),
  experimentalLspTy: ocarinaMode ? Config.succeed(false) : bool("OPENCODE_EXPERIMENTAL_LSP_TY"),
  experimentalLspTool: ocarinaMode ? Config.succeed(false) : enabledByExperimental("OPENCODE_EXPERIMENTAL_LSP_TOOL"),
  experimentalOxfmt: ocarinaMode ? Config.succeed(false) : enabledByExperimental("OPENCODE_EXPERIMENTAL_OXFMT"),
  experimentalPlanMode: ocarinaMode ? Config.succeed(false) : enabledByExperimental("OPENCODE_EXPERIMENTAL_PLAN_MODE"),
  experimentalCodeMode: ocarinaMode ? Config.succeed(false) : enabledByExperimental("OPENCODE_EXPERIMENTAL_CODE_MODE"),
  experimentalEventSystem: ocarinaMode
    ? Config.succeed(false)
    : enabledByExperimental("OPENCODE_EXPERIMENTAL_EVENT_SYSTEM"),
  experimentalWorkspaces: ocarinaMode
    ? Config.succeed(false)
    : enabledByExperimental("OPENCODE_EXPERIMENTAL_WORKSPACES"),
  experimentalIconDiscovery: ocarinaMode
    ? Config.succeed(false)
    : enabledByExperimental("OPENCODE_EXPERIMENTAL_ICON_DISCOVERY"),
  outputTokenMax: ocarinaMode ? Config.succeed(undefined) : positiveInteger("OPENCODE_EXPERIMENTAL_OUTPUT_TOKEN_MAX"),
  bashDefaultTimeoutMs: ocarinaMode
    ? Config.succeed(undefined)
    : positiveInteger("OPENCODE_EXPERIMENTAL_BASH_DEFAULT_TIMEOUT_MS"),
  experimentalNativeLlm: ocarinaMode ? Config.succeed(false) : bool("OPENCODE_EXPERIMENTAL_NATIVE_LLM"),
  experimentalWebSockets: ocarinaMode ? Config.succeed(false) : bool("OPENCODE_EXPERIMENTAL_WEBSOCKETS"),
  client: ocarinaMode ? Config.succeed("cli") : Config.string("OPENCODE_CLIENT").pipe(Config.withDefault("cli")),
}) {}

export type Info = Context.Service.Shape<typeof Service>

const emptyConfigLayer = Service.layer.pipe(
  Layer.provide(ConfigProvider.layer(ConfigProvider.fromUnknown({}))),
  Layer.orDie,
)

export const layer = (overrides: Partial<Info> = {}) =>
  Layer.effect(
    Service,
    Effect.gen(function* () {
      const flags = yield* Service
      if (!ocarinaMode) return Service.of({ ...flags, ...overrides })
      return Service.of({
        ...flags,
        ...overrides,
        autoShare: false,
        pure: true,
        disableExternalSkills: true,
        disableLspDownload: true,
        disableClaudeCodePrompt: true,
        disableClaudeCodeSkills: true,
        enableExa: false,
        enableParallel: false,
        enableExperimentalModels: false,
        experimentalReferences: false,
        experimentalBackgroundSubagents: false,
        experimentalLspTy: false,
        experimentalLspTool: false,
        experimentalOxfmt: false,
        experimentalPlanMode: false,
        experimentalCodeMode: false,
        experimentalEventSystem: false,
        experimentalWorkspaces: false,
        experimentalIconDiscovery: false,
        outputTokenMax: undefined,
        bashDefaultTimeoutMs: undefined,
        experimentalNativeLlm: false,
        experimentalWebSockets: false,
        client: "cli",
      })
    }),
  ).pipe(Layer.provide(emptyConfigLayer))

export const node = LayerNode.make({ service: Service, layer: Service.layer.pipe(Layer.orDie), deps: [] })

export * as RuntimeFlags from "./runtime-flags"
import { LayerNode } from "@opencode-ai/core/effect/layer-node"
