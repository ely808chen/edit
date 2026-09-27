import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import { game } from './game/controller';
import './styles.css';

if (import.meta.env.DEV) (window as unknown as { __murmur: typeof game }).__murmur = game;

createRoot(document.getElementById('root')!).render(<App />);
