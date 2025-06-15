// Event listeners for the home page and anywhere there is grid-item

['click', 'keydown'].forEach(eventType => {
  document.removeEventListener(eventType, globalAddEventListener);
  document.addEventListener(eventType, globalAddEventListener);
});

let wasEditing = false
function globalAddEventListener (event) {
  const editing =  event.target.closest('.selectable.active') || event.target.querySelector('.selectable.active')
  const modal = document.getElementById('info-modal');
  const modalActive = modal?.getAttribute('active') !== null;
  
  if (editing && !modalActive) return
  
  const watchingOrHistory = event.target.closest('#continue-watching .grid-item') || event.target.closest('#history .grid-item');
  //const bookmarks = event.target.closest('#bookmarks .grid-item');
  const gridItem = event.target.closest('.grid-item, .profile-item');
  const section = event.target.closest('section');
  if (gridItem && !modalActive) {
    const { mediaType, id, name, sno, eno, index } = gridItem.dataset;
    if ((event.type === 'click' && !watchingOrHistory ||
        event.type === 'keydown' && event.key === 'Enter' && (!watchingOrHistory || event.shiftKey))) {
      if (!event.target.closest('.grid-options')) {
        openModal(gridItem.dataset);
        event.stopPropagation();
      } else {
        console.log('toggling bookmark')
        event.target.closest('.grid-options')?.classList.toggle('open');
        toggleBookmark('bookmarks', id, mediaType, sno, eno, index);
        if (section.id !== 'bookmarks') return 
        gridItem.remove()
      }
      return;
    }

    if ((watchingOrHistory) && (event.type === 'click' || event.type === 'keydown' && event.key === 'Enter')) {
      if ( !event.target.closest('.grid-actions') && !editing && !wasEditing) {
        console.log(id, mediaType,sno, eno, null)
        window.location.href = `/watch/${mediaType}/${id}/${name}${sno && eno ? `/${sno}/${eno}` : ""}`;
        event.stopPropagation();
        return;
      }
      if ( event.target.matches(".options-buttons")) {
        const options = event.target.closest('.grid-options')
        document.querySelectorAll('.grid-options').forEach(item => {
          if (item.closest('.bookmarks')) return
          const open = options.classList.contains('open')
          if (!open) {
            item.classList.remove('open')
          }
        })
        options?.classList.toggle('open');
        event.stopPropagation();
        return;
      }
      if (event.target.closest('.options-menu')) {
        if (event.target.closest('.remove')) {
          getConfirm({
            success: {title : 'Success!', message : 'Item removed from history.'},
            decline: {title : 'Canceled!', message : 'Item not removed. '}
          }).then(confirmed => { 
            console.log('exited',confirmed)
            if (confirmed) {
              const sectionId = section.id
              const logType = section.dataset.type
              removeFromLocalStorage(logType, Number(id), mediaType, sno, eno, index)
              console.log(sectionId,logType,'item removed')
              gridItem.remove()
            }
          });
          event.preventDefault()
        }
        if (event.target.closest('.view-details')) {
          isViewingDetails = true
          openModal(gridItem.dataset)
          event.stopPropagation();
        }
        if (event.target.closest('.mark-item')) {
          const type = event.target.closest('.mark-item').dataset.type
          console.log(type, section)
          markItemAs(type, gridItem, section)
        }
      }
      return;
    }
    return;
  }
  if (modalActive) {
    if (event.key === 'Escape' || event.target.matches('#info-modal')) {
      if (loc().includes('/movie?id=') || loc().includes('/tv?id=')) {
        window.history.pushState('', '', '/')
      }
      document.getElementById('modal-details').innerHTML = '';
      modal.removeAttribute('active','');
      ['#header' , '.bottom-bar'].forEach(selector => {
        const bar = document.querySelector(selector)
        if (document.querySelectorAll('.expandable.expanded').length) return
        bar.classList.remove('hidden')
      })
      isViewingDetails = false
      event.stopPropagation();
    }
    return;
  }
}

(function enableTabTrap() {
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;

    // Find the trap container
    const selectors = ['.modal[active] #modal-details', '.expandable.expanded', '.dialog', '.filter-menu[active]']
    const container = selectors.map((selector) => document.querySelector(selector))
      .find((el) => el);
      
    if (!container) return;

    // Gather all focusable elements within the trap
    const FOCUSABLE_SELECTORS = `
      a[href],
      button:not([disabled]),
      textarea:not([disabled]),
      input:not([disabled]),
      select:not([disabled]),
      [tabindex]:not([tabindex="-1"])
    `;
    const focusable = () => Array.from(
      container.querySelectorAll(FOCUSABLE_SELECTORS)
    ).filter(el => el.offsetParent !== null);

    focusable()
    
    if (focusable().length === 0) return;

    const current = document.activeElement;

    if (!container.contains(current)) {
      event.preventDefault()
      focusable()[0].focus();
      return;
    }

    // Loop forward or backward
    let index = focusable().indexOf(current);
    if (index === -1) {
      event.preventDefault();
      focusable()[0].focus();
      return;
    }

    if (event.shiftKey) {
      // Loop backwards
      if (index === 0) {
        event.preventDefault();
        focusable()[focusable().length - 1].focus();
      }
    } else {
      // Loop forwards
      if (index === focusable().length - 1) {
        event.preventDefault();
        focusable()[0].focus();
      }
    }
  });
})();

