import eventFrame from '../assets/pictures/event_base_innerframe.png'

export function EventLayout({ title, illustration, fallback = null, children }) {
  return (
    <div className="event-card">
      <img className="event-card__base-frame" src={eventFrame} alt="" aria-hidden="true" />
      <header className="event-card__header-slot"><h2>{title}</h2></header>
      <div className="event-illustration event-illustration-slot">
        {illustration
          ? <img className="event-illustration__image" src={illustration} alt="" />
          : fallback}
      </div>
      <article>{children}</article>
    </div>
  )
}
