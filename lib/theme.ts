import type { ThemeRegistration } from 'shiki'

/**
 * Code on the Wedgie's frame: black, with Knock's colors. Strings are the door's yellow, keywords the label's
 * violet lightened to read on black, calls white. Green and red stay the Wedgie's buttons, so no token wears them.
 */
export const KNOCK_THEME: ThemeRegistration = {
  name: 'knock',
  type: 'dark',
  colors: { 'editor.background': '#1a1b1a', 'editor.foreground': '#f2effa' },
  tokenColors: [
    { settings: { foreground: '#f2effa', background: '#1a1b1a' } },
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: '#9a94ab', fontStyle: 'italic' } },
    {
      scope: ['string', 'string.quoted', 'string.template', 'punctuation.definition.string', 'markup.inline.raw'],
      settings: { foreground: '#ffd21f' },
    },
    {
      scope: [
        'keyword',
        'keyword.control',
        'keyword.operator.new',
        'keyword.operator.expression',
        'keyword.other',
        'storage',
        'storage.type',
        'storage.modifier',
        'entity.name.tag',
        'markup.heading',
      ],
      settings: { foreground: '#b9a9ff' },
    },
    {
      scope: ['entity.name.function', 'support.function', 'meta.function-call', 'variable.function'],
      settings: { foreground: '#ffffff', fontStyle: 'bold' },
    },
    {
      scope: ['entity.name.type', 'support.type', 'entity.name.class', 'entity.other.inherited-class', 'support.class'],
      settings: { foreground: '#d9d1f7' },
    },
    {
      scope: ['constant.numeric', 'constant.language', 'constant.character', 'constant.other', 'support.constant'],
      settings: { foreground: '#ffe9a3' },
    },
    {
      scope: ['support.type.property-name', 'meta.object-literal.key', 'entity.other.attribute-name', 'variable.other.property'],
      settings: { foreground: '#d9d1f7' },
    },
    { scope: ['punctuation', 'meta.brace', 'keyword.operator'], settings: { foreground: '#aaa4bb' } },
    { scope: ['markup.inserted'], settings: { foreground: '#d9d1f7' } },
    { scope: ['markup.deleted'], settings: { foreground: '#9a94ab' } },
  ],
}
