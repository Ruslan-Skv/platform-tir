import Paragraph from '@tiptap/extension-paragraph';

/** Класс на `<p>`: красная строка на сайте и в превью редактора (см. BlogPostPage.module.css). */
export const BLOG_PARAGRAPH_INDENT_CLASS = 'blog-paragraph-indent';

/**
 * Абзац с сохранением `class` в HTML (для «красной строки» и др. пометок).
 */
export const BlogParagraph = Paragraph.extend({
  addAttributes() {
    return {
      class: {
        default: null,
        parseHTML: (element) => element.getAttribute('class'),
        renderHTML: (attributes) => {
          if (!attributes.class) return {};
          return { class: attributes.class as string };
        },
      },
    };
  },
});
