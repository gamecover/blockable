import { MainMenuButton } from './components/MainMenuButton.jsx'
import './styles/main-screen.css'

export function MainScreen({ onStart, onContinue, canContinue }) {
  return (
    <main className="main-screen" aria-label="BLOCK ANGLE 메인 메뉴">
      <div className="main-screen__shade" aria-hidden="true" />
      <nav className="main-menu" aria-label="게임 메뉴">
        <MainMenuButton onClick={onStart} delay={0}>START</MainMenuButton>
        <MainMenuButton onClick={onContinue} disabled={!canContinue} delay={0.08}>CONTINUE</MainMenuButton>
        <MainMenuButton disabled delay={0.16} description="준비 중">OPTION</MainMenuButton>
      </nav>
    </main>
  )
}
