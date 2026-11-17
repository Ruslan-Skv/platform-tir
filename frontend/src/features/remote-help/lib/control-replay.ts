/**
 * Воспроизведение событий управления на экране сотрудника.
 * Клики диспетчеризуются в точку (elementFromPoint), текст вводится через
 * native-setter (React onChange) и execCommand (contenteditable/TipTap).
 * Реальные системные действия браузер для синтетических событий не делает —
 * это осознанное ограничение «управления внутри приложения».
 */
import type { ControlMessage } from './control-protocol';

export interface ControlReplay {
  apply: (message: ControlMessage) => void;
  setEnabled: (enabled: boolean) => void;
  destroy: () => void;
}

export function createControlReplay(): ControlReplay {
  let enabled = false;

  // Указатель «куда нажать» — красная точка, не перехватывает клики
  const dot = document.createElement('div');
  dot.setAttribute('data-remote-help-cursor', '');
  dot.style.cssText =
    'position:fixed;left:0;top:0;width:18px;height:18px;margin:-9px 0 0 -9px;' +
    'border-radius:50%;background:rgba(217,6,82,.85);border:2px solid #fff;' +
    'box-shadow:0 1px 6px rgba(0,0,0,.45);pointer-events:none;z-index:2147483646;' +
    'transform:translate(-9999px,-9999px);transition:transform .05s linear;';
  document.body.appendChild(dot);

  function moveCursor(x: number, y: number): void {
    dot.style.transform = `translate(${Math.round(x * window.innerWidth)}px, ${Math.round(
      y * window.innerHeight
    )}px)`;
  }

  function elementAt(x: number, y: number): Element | null {
    return document.elementFromPoint(x * window.innerWidth, y * window.innerHeight);
  }

  function dispatchMouse(
    element: Element,
    type: string,
    x: number,
    y: number,
    button: number
  ): void {
    const px = x * window.innerWidth;
    const py = y * window.innerHeight;
    const opts: MouseEventInit = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: px,
      clientY: py,
      button,
      buttons: type === 'up' ? 0 : 1,
    };
    // Реальная последовательность браузера: pointerdown/up + mousedown/up, затем click/dblclick
    if (typeof PointerEvent === 'function' && (type === 'down' || type === 'up')) {
      element.dispatchEvent(
        new PointerEvent(`pointer${type}`, {
          ...opts,
          pointerId: 1,
          pointerType: 'mouse',
          isPrimary: true,
        })
      );
    }
    const mouseType = type === 'down' ? 'mousedown' : type === 'up' ? 'mouseup' : type;
    element.dispatchEvent(new MouseEvent(mouseType, opts));
  }

  /** Ближайший прокручиваемый контейнер для wheel. */
  function scrollTarget(element: Element | null): Element | null {
    let node: Element | null = element;
    while (node && node !== document.documentElement) {
      const style = window.getComputedStyle(node);
      const scrollable =
        /(auto|scroll|overlay)/.test(style.overflowY) ||
        /(auto|scroll|overlay)/.test(style.overflow);
      if (
        scrollable &&
        (node.scrollHeight > node.clientHeight || node.scrollWidth > node.clientWidth)
      ) {
        return node;
      }
      node = node.parentElement;
    }
    return null;
  }

  function activeEditable(): HTMLElement | null {
    const el = document.activeElement;
    if (!el) return null;
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return el;
    if (el instanceof HTMLElement && el.isContentEditable) return el;
    return null;
  }

  /** React слушает onChange через нативный сеттер value — вызываем его напрямую. */
  function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string): void {
    const proto =
      el instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
    try {
      descriptor?.set?.call(el, value);
    } catch {
      el.value = value;
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function insertText(text: string): void {
    const editable = activeEditable();
    if (!editable) return;
    if (editable instanceof HTMLInputElement || editable instanceof HTMLTextAreaElement) {
      const start = editable.selectionStart ?? editable.value.length;
      const end = editable.selectionEnd ?? editable.value.length;
      setNativeValue(editable, editable.value.slice(0, start) + text + editable.value.slice(end));
      const caret = start + text.length;
      try {
        editable.setSelectionRange(caret, caret);
      } catch {
        /* не текстовое поле */
      }
    } else {
      document.execCommand('insertText', false, text);
    }
  }

  function deleteBackward(): void {
    const editable = activeEditable();
    if (!editable) return;
    if (editable instanceof HTMLInputElement || editable instanceof HTMLTextAreaElement) {
      const start = editable.selectionStart ?? editable.value.length;
      const end = editable.selectionEnd ?? editable.value.length;
      if (start !== end) {
        setNativeValue(editable, editable.value.slice(0, start) + editable.value.slice(end));
        try {
          editable.setSelectionRange(start, start);
        } catch {
          /* ok */
        }
      } else if (start > 0) {
        setNativeValue(editable, editable.value.slice(0, start - 1) + editable.value.slice(start));
        try {
          editable.setSelectionRange(start - 1, start - 1);
        } catch {
          /* ok */
        }
      }
    } else {
      document.execCommand('delete');
    }
  }

  function applyKey(message: Extract<ControlMessage, { t: 'key' }>): void {
    const target = activeEditable() ?? document.body;
    const init: KeyboardEventInit = {
      key: message.key,
      code: message.code,
      bubbles: true,
      cancelable: true,
      ctrlKey: message.ctrl,
      shiftKey: message.shift,
      altKey: message.alt,
      metaKey: message.meta,
    };
    target.dispatchEvent(new KeyboardEvent('keydown', init));

    // Ctrl+A — выделяем текст в активном поле (по умолчанию браузер не сработает)
    if (
      message.ctrl &&
      (message.key === 'a' || message.key === 'A' || message.key === 'ф' || message.key === 'Ф')
    ) {
      const editable = activeEditable();
      if (editable instanceof HTMLInputElement || editable instanceof HTMLTextAreaElement) {
        editable.select();
      } else if (editable) {
        document.execCommand('selectAll');
      }
      target.dispatchEvent(new KeyboardEvent('keyup', init));
      return;
    }

    if (!message.ctrl && !message.meta && !message.alt) {
      if (message.key === 'Backspace') {
        deleteBackward();
      } else if (message.key.length === 1) {
        insertText(message.key);
      }
    }

    target.dispatchEvent(new KeyboardEvent('keyup', init));
  }

  function applyPointer(message: Extract<ControlMessage, { t: 'pointer' }>): void {
    const element = elementAt(message.x, message.y);
    if (!element) return;

    if (message.type === 'down') {
      const focusable = element.closest(
        'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'
      );
      if (focusable instanceof HTMLElement && focusable !== document.body) {
        focusable.focus({ preventScroll: true });
      }
    }

    dispatchMouse(element, message.type, message.x, message.y, message.button);
  }

  return {
    apply(message) {
      if (message.t === 'cursor') {
        moveCursor(message.x, message.y);
        return;
      }
      if (message.t === 'mode') {
        enabled = message.control;
        dot.style.opacity = enabled ? '1' : '0.55';
        return;
      }
      if (!enabled) return;

      if (message.t === 'pointer') {
        applyPointer(message);
      } else if (message.t === 'wheel') {
        const element = elementAt(message.x, message.y);
        element?.dispatchEvent(
          new WheelEvent('wheel', {
            bubbles: true,
            cancelable: true,
            view: window,
            deltaX: message.deltaX,
            deltaY: message.deltaY,
            clientX: message.x * window.innerWidth,
            clientY: message.y * window.innerHeight,
          })
        );
        const target = scrollTarget(element) ?? document.scrollingElement;
        if (target) {
          target.scrollBy({
            left: message.deltaX,
            top: message.deltaY,
            behavior: 'auto',
          } as ScrollToOptions);
        }
      } else if (message.t === 'key') {
        applyKey(message);
      }
    },
    setEnabled(next) {
      enabled = next;
      dot.style.opacity = next ? '1' : '0.55';
    },
    destroy() {
      dot.remove();
    },
  };
}
