import { useRef, useState } from 'preact/hooks';
import { usePage } from '../../hooks/usePage.js';
import { useFocusTrap } from '../../hooks/useFocusTrap.js';
import { downloadBackup, restoreBackup, eraseData } from './actions.js';
import UserSection from './UserSection.jsx';
import Icon from '../../components/common/Icon.jsx';

export default function Library() {
  usePage('Your Lists | Pixelstream', ['/library/styles.css']);
  const [panel, setPanel] = useState(false),
    [merge, setMerge] = useState(true);
  const file = useRef(),
    ref = useRef();
  useFocusTrap(ref, panel, () => setPanel(false));
  return <>
    <UserSection
      id="continue-watching"
      logType="watching"
      title="Continue Watching"
    />
    <UserSection
      id="history"
      logType="history"
      title="History"
    />
    <UserSection
      id="bookmarks"
      logType="bookmarks"
      title="Your Watchlist"
    />
    {panel && <div class="dialog-overlay" onClick={() => setPanel(false)} />}
    <div class="library-control button-container detach">

      <button
        id="control-menu-button"
        aria-label="Library controls"
        onClick={() => setPanel(!panel)}
      >

        <Icon name="gear" />

      </button>

      <div
        ref={ref}
        class={`control-modal modal ${panel ? 'show' : ''}`}
        {...(panel ? { active: '' } : {})}
      >

        <div>

          <h2>Import &amp; Export</h2>

        </div>

        <div class="import-export">

          <div class="import">

            <div>

              <h4>Import</h4>

              <p class="desc">Import data from a backup file.</p>

              <label for="merge-option">

                <input
                  type="checkbox"
                  id="merge-option"
                  style={{ maxWidth: 16 }}
                  checked={merge}
                  onChange={e => setMerge(e.currentTarget.checked)}
                />

                <p>Merge existing data with import data.</p>

              </label>

            </div>

            <button
              id="import"
              aria-label="Import backup"
              onClick={() => file.current.click()}
            >

              <Icon name="file-import" />

            </button>

            <input
              ref={file}
              type="file"
              id="import-file"
              accept=".json"
              hidden
              onChange={e => {
                const f = e.currentTarget.files[0];
                if (f)
                  void restoreBackup(f, merge);
                e.currentTarget.value = '';
              }}
            />

          </div>

          <div class="export">

            <div>

              <h4>Export</h4>

              <p class="desc">Export a backup as a .json file.</p>

            </div>

            <button
              id="export"
              aria-label="Export backup"
              onClick={() => downloadBackup()}
            >

              <Icon name="file-export" />

            </button>

          </div>

        </div>

        <div>

          <h2>Erase data</h2>

          <p class="desc">Warning: This action is irreversible.</p>

        </div>

        <div class="clear-all">

          <button id="clear-all" onClick={eraseData}><Icon name="trash-can" />Clear</button>

        </div>

      </div>

    </div>
  </>;
}
