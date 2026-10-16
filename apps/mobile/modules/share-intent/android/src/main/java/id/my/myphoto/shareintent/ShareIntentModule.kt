package id.my.myphoto.shareintent

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Bridge between an incoming Android ACTION_SEND / ACTION_SEND_MULTIPLE intent
 * and the JS layer. MainActivity captures the EXTRA_STREAM URIs from the intent
 * on onCreate / onNewIntent and stuffs them into [ShareIntentStore.pending].
 * JS calls [consumeShared] on mount + on AppState 'active' to drain the queue
 * and upload to MySpace.
 *
 * Drain-on-read (rather than keep-and-mark-consumed) is deliberate: it means
 * the same Share intent can never accidentally upload twice on a re-render or
 * a foreground/background flip.
 */
object ShareIntentStore {
  @Volatile var pending: List<Map<String, String>> = emptyList()
}

class ShareIntentModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ShareIntent")

    AsyncFunction("consumeShared") {
      val batch = ShareIntentStore.pending
      ShareIntentStore.pending = emptyList()
      return@AsyncFunction batch
    }
  }
}
