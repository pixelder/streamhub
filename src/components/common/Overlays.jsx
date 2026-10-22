import { useEffect, useRef } from 'preact/hooks';
import { useUI } from '../../hooks/useUI.js';
import { useFocusTrap } from '../../hooks/useFocusTrap.js';
import { finishConfirmation, dismissToast } from '../../stores/ui.js';
import Icon from './Icon.jsx';
import DetailsModal from '../media/DetailsModal.jsx';

function Toast({ toast }) {
  useEffect(
    () => {
      const timer = setTimeout(() => dismissToast(toast.id), 5000);
      return () => clearTimeout(timer);
    },
    [toast.id]
  );
  return <div
    class="msg"
    onClick={() => dismissToast(toast.id)}
    role="status"
  >

    <p>{toast.message}</p>

  </div>;
}

function Confirmation({ data }) {
  const ref = useRef();
  useFocusTrap(ref, true, () => finishConfirmation(false));
  return <div
    class="dialog-overlay"
    onClick={e => {
      if (e.target === e.currentTarget)
        finishConfirmation(false);
    }}
  >

    <div
      class="dialog"
      ref={ref}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >

      <h2 id="confirm-title">{data.title || 'Are you sure?'}</h2>

      <div class="message-box">

        <span class="icon">

          <Icon name="triangle-exclamation" />

        </span>

        <span class="message">

          <p>{data.message || 'This action can not be undone. Do you wish to proceed?'}</p>

        </span>

      </div>

      <div class="dialog-buttons">

        <button id="decline" onClick={() => finishConfirmation(false)}>Cancel</button>

        <button id="accept" onClick={() => finishConfirmation(true)}><Icon name={data.accept === 'Import' ? 'download' : 'trash-can'} />&nbsp;{data.accept || 'Delete'}</button>

      </div>

    </div>

  </div>;
}

export default function Overlays() {
  const ui = useUI();
  return <>
    <DetailsModal />
    {ui.confirmation && <Confirmation data={ui.confirmation} />}
    <div class="notifications">{ui.toasts.map(toast => <Toast key={toast.id} toast={toast} />)}</div>
  </>;
}
