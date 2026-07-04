// Turn a raw local-model id like "TheBloke/qwen2.5-coder-7b-instruct.Q4_K_M.gguf"
// into a readable "Qwen 2.5 Coder 7B Instruct". Mirrors the helper used
// server-side in the add-local-model edge function.
export const prettifyModelName = (raw: string): string => {
  if (!raw) return raw;
  let s = raw.split('/').pop() ?? raw;
  s = s.replace(/\.(gguf|bin|safetensors|pt|onnx)$/i, '');
  s = s.replace(/[._]+/g, '-');
  s = s.replace(/-(q\d+(_[a-z0-9]+)*|f16|f32|bf16|int8|int4|awq|gptq)$/i, '');
  return s
    .split('-')
    .filter(Boolean)
    .map((part) => {
      if (/^\d+(\.\d+)?[bBmM]$/.test(part)) return part.toUpperCase();
      if (/^v?\d+(\.\d+)*$/.test(part)) return part;
      if (/^(gpt|llm|ai|api|sdk)$/i.test(part)) return part.toUpperCase();
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(' ');
};
