// Event listeners for the home page and anywhere there is grid-item

['click', 'keydown'].forEach(eventType => {
  document.removeEventListener(eventType, globalAddEventListener);
  document.addEventListener(eventType, globalAddEventListener);
});

let wasEditing = false
function globalAddEventListener (event) {
  const editing =  event.target.closest('.selectable.active') || event.target.querySelector('.selectable.active')
  const modal = document.getElementById('info-modal');
  const modalActive = modal.getAttribute('active') !== null;
  
  if (editing && !modalActive) return
  
  const watchingOrHistory = event.target.closest('#continue-watching .grid-item') || event.target.closest('#history .grid-item');
  //const bookmarks = event.target.closest('#bookmarks .grid-item');
  const gridItem = event.target.closest('.grid-item, .profile-item');
  if (gridItem && !modalActive) {
    const { mediaType, id, name, sno, eno, index } = gridItem.dataset;
    if ((event.type === 'click' && !watchingOrHistory ||
        event.type === 'keydown' && event.key === 'Enter' && (!watchingOrHistory || event.shiftKey))) {
      if (!event.target.closest('.grid-options')) {
        openModal(event);
        event.stopPropagation();
      } else {
        console.log('toggling bookmark')
        event.target.closest('.grid-options')?.classList.toggle('open');
        toggleBookmark('bookmarks', id, mediaType, sno, eno, index);
        loadUserContent( 'bookmarks', 'bookmarks');
      }
    } else if ((watchingOrHistory) && (event.type === 'click' || event.type === 'keydown' && event.key === 'Enter')) {
      if ( !event.target.closest('.grid-actions') && !editing && !wasEditing) {
        console.log(id, mediaType,sno, eno, null)
        window.location.href = `/watch/${mediaType}/${id}/${name}${sno && eno ? `/${sno}/${eno}` : ""}`;
        event.stopPropagation();
      } else if ( event.target.matches(".options-buttons")) {
        event.target.closest('.grid-options')?.classList.toggle('open');
        event.stopPropagation();
      } else if (event.target.closest('.options-menu button')) {
        event.preventDefault()
        getConfirm({
          success: {title : 'Success!', message : 'Item removed from history.'},
          decline: {title : 'Canceled!', message : 'Item not removed. '}
        }).then(confirmed => { 
          console.log('exited',confirmed)
          if (confirmed) {
            const section = event.target.closest('section');
            const sectionId = section.id
            const logType = section.dataset.type
            removeFromLocalStorage(logType, Number(id), mediaType, sno, eno, index)
            console.log(sectionId,logType,'item removed')
            loadUserContent( sectionId, logType);
          }
        });
        event.stopPropagation();
      }
    }
  } else if (modalActive) {
    if (event.key === 'Escape' || event.target.matches('#info-modal')) {
      modal.removeAttribute('active','')
      event.stopPropagation();
    }
  }
}
