import { LayerNode } from "@opencode-ai/core/effect/layer-node"
import { httpClient } from "@opencode-ai/core/effect/app-node-platform"
import { CrossSpawnSpawner } from "@opencode-ai/core/cross-spawn-spawner"
import { Question } from "@/question"
import { QuestionTool } from "./question"
import { WebFetchTool } from "./webfetch"
import { ReadTool } from "./read"
import { GlobTool } from "./glob"
import { GrepTool } from "./grep"
import { TaskTool } from "./task"
import * as Tool from "./tool"
import { Plugin } from "../plugin"
import { WebSearchTool } from "./websearch"
import { EditTool } from "./edit"
import { PythonTool } from "./python"
import * as Truncate from "./truncate"
import { Effect, Layer, Context, Schema, Scope } from "effect"
import { InstanceState } from "@/effect/instance-state"
import type { InstanceContext } from "@/project/instance-context"
import { Agent } from "../agent/agent"
import { RuntimeFlags } from "@/effect/runtime-flags"
import { ProviderV2 } from "@opencode-ai/core/provider"
import { ModelV2 } from "@opencode-ai/core/model"
import { PermissionV1 } from "@opencode-ai/core/v1/permission"

/**
 * Closed allowlist for the legacy Ocarina research runtime. This is enforced
 * at registry construction and again when definitions are materialized for a
 * model; configuration, plugins, and MCP cannot extend it.
 */
export const RESEARCH_TOOL_ALLOWLIST = ["webfetch", "websearch", "question", "read", "glob", "grep", "task", "edit", "python"] as const
const researchToolAllowlist = new Set<string>(RESEARCH_TOOL_ALLOWLIST)

export function isResearchTool(id: string) {
  return researchToolAllowlist.has(id)
}

export function webSearchEnabled(providerID: ProviderV2.ID, flags = { exa: false, parallel: false }) {
  return (
    providerID === ProviderV2.ID.opencode ||
    providerID === ProviderV2.ID.make("opencode-go") ||
    flags.exa ||
    flags.parallel
  )
}

type State = {
  builtin: Tool.Def[]
}

export interface Interface {
  readonly ids: () => Effect.Effect<string[]>
  readonly all: () => Effect.Effect<Tool.Def[]>
  readonly named: () => Effect.Effect<{ task: Tool.Def; read: Tool.Def }>
  readonly tools: (model: {
    providerID: ProviderV2.ID
    modelID: ModelV2.ID
    agent: Agent.Info
    permission?: PermissionV1.Ruleset
  }) => Effect.Effect<Tool.Def[]>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/ToolRegistry") {}

function disabled(id: string): Tool.Def {
  return {
    id,
    description: `${id} is disabled in the Ocarina runtime.`,
    parameters: Schema.Unknown,
    execute: () => Effect.die(new Tool.DisabledError({ tool: id })),
  }
}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const plugin = yield* Plugin.Service

    const questionInfo = yield* QuestionTool
    const webfetchInfo = yield* WebFetchTool
    const websearchInfo = yield* WebSearchTool

    const initFn = (() =>
      Effect.gen(function* () {
        const question = yield* Tool.init(questionInfo)
        const webfetch = yield* Tool.init(webfetchInfo)
        const websearch = yield* Tool.init(websearchInfo)
        const readInfo = yield* ReadTool
        const read = yield* Tool.init(readInfo)
        const globInfo = yield* GlobTool
        const glob = yield* Tool.init(globInfo)
        const grepInfo = yield* GrepTool
        const grep = yield* Tool.init(grepInfo)
        const taskInfo = yield* TaskTool
        const task = yield* Tool.init(taskInfo)
        const editInfo = yield* EditTool
        const edit = yield* Tool.init(editInfo)
        const pythonInfo = yield* PythonTool
        const python = yield* Tool.init(pythonInfo)

        return {
          builtin: [webfetch, websearch, question, read, glob, grep, task, edit, python],
        }
      })) as (ctx: InstanceContext) => Effect.Effect<State, never, Scope.Scope>
    const state = yield* InstanceState.make<State>(initFn)

    const all: Interface["all"] = Effect.fn("ToolRegistry.all")(function* () {
      const s = yield* InstanceState.get(state)
      return s.builtin.filter((tool) => isResearchTool(tool.id)) as Tool.Def[]
    })

    const ids: Interface["ids"] = Effect.fn("ToolRegistry.ids")(function* () {
      return (yield* all()).map((tool) => tool.id)
    })

    const tools: Interface["tools"] = Effect.fn("ToolRegistry.tools")(function* () {
      const visible = (yield* all()).filter((tool) => isResearchTool(tool.id))

      return yield* Effect.forEach(
        visible,
        Effect.fnUntraced(function* (tool: Tool.Def) {
          const output = {
            description: tool.description,
            parameters: tool.parameters,
            jsonSchema: tool.jsonSchema,
          }
          yield* plugin.trigger("tool.definition", { toolID: tool.id }, output)
          const jsonSchema =
            output.parameters === tool.parameters || output.jsonSchema !== tool.jsonSchema
              ? output.jsonSchema
              : undefined
          return {
            id: tool.id,
            description: output.description,
            parameters: output.parameters,
            jsonSchema,
            execute: tool.execute,
            formatValidationError: tool.formatValidationError,
          }
        }),
        { concurrency: "unbounded" },
      )
    })

    const named: Interface["named"] = Effect.fn("ToolRegistry.named")(function* () {
      const s = yield* InstanceState.get(state)
      return {
        task: s.builtin.find((t) => t.id === "task") ?? disabled("task"),
        read: s.builtin.find((t) => t.id === "read") ?? disabled("read"),
      }
    })

    return Service.of({ ids, all, named, tools })
  }),
)

export const node = LayerNode.make({
  service: Service,
  layer,
  deps: [
    CrossSpawnSpawner.node,
    Plugin.node,
    Question.node,
    Agent.node,
    httpClient,
    Truncate.node,
    RuntimeFlags.node,
  ],
})

export * as ToolRegistry from "./registry"
