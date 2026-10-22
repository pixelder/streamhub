const listeners = new Set();
let state = {
  modal: null,
  back: [],
  forward: [],
  confirmation: null,
  toasts: []
};
export const uiState = () => state;
export const subscribeUI = fn => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

function update(changes) {
  state = { ...state, ...changes };
  listeners.forEach(fn => fn(state));
}

export function openDetails(item, nested = false) {
  update(
    {
      modal: {
        id: item.id,
        mediaType: item.mediaType || item.media_type,
        sno: item.sno,
        eno: item.eno
      },
      back: nested && state.modal ? [...state.back, state.modal] : [],
      forward: []
    }
  );
}

export function closeDetails() {
  update({
    modal: null,
    back: [],
    forward: []
  });
}

export function modalBack() {
  if (!state.back.length)
    return;
  update(
    {
      modal: state.back.at(-1),
      back: state.back.slice(0, -1),
      forward: [state.modal, ...state.forward]
    }
  );
}

export function modalForward() {
  if (!state.forward.length)
    return;
  update(
    {
      modal: state.forward[0],
      back: [...state.back, state.modal],
      forward: state.forward.slice(1)
    }
  );
}

export function confirmAction(options = {}) {
  return new Promise(resolve => update({ confirmation: { ...options, resolve } }));
}

export function finishConfirmation(value) {
  state.confirmation?.resolve(value);
  update({ confirmation: null });
}

export function notify(message) {
  const id = Date.now() + Math.random();
  update({
    toasts: [
      ...state.toasts,
      { id, message }
    ]
  });
  return id;
}

export function dismissToast(id) {
  update({ toasts: state.toasts.filter(t => t.id !== id) });
}
