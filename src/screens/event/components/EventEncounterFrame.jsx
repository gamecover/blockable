import eventFrame from '../assets/pictures/event_base_innerframe.png'

export function EventEncounterFrame({ title, image, description, children, onLeave, selectLabel = '선택', leaveLabel = '나가기' }) {
  return (
    <section className="event-encounter-frame">
      <img className="event-encounter-frame__background" src={eventFrame} alt="" aria-hidden="true" />
      <h3>{title}</h3>
      <div className="event-encounter-frame__image">{image}</div>
      <div className="event-encounter-frame__description">{description}{children}</div>
      <footer>
        <button type="button" className="primary-button">{selectLabel}</button>
        <button type="button" className="secondary-button" onClick={onLeave}>{leaveLabel}</button>
      </footer>
    </section>
  )
}
