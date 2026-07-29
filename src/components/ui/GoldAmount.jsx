import coinPocketIcon from '../../assets/pictures/ui/icons/icon_coin_pocket_alpha.png'

export function GoldAmount({ amount, suffix = '' }) {
  return (
    <span className="gold-amount">
      <img src={coinPocketIcon} alt="" aria-hidden="true" />
      <span>{amount}{suffix}</span>
    </span>
  )
}
