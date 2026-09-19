export type PreviewScreen = 'home' | 'review' | 'books';

export interface DesignProps {
  screen: PreviewScreen;
  onScreenChange: (screen: PreviewScreen) => void;
}
