/**
 * @local/dsh-plugin-voice-input — node half.
 *
 * Host-side no-op loader entry. All behavior lives in the client bundle
 * (`./client`): the mic button is rendered by the browser half; nothing runs
 * on the host for this plugin.
 */

/** Host plugin body — no host-side behavior for the voice input plugin. */
function apply(_ctx) {}

export { apply };
