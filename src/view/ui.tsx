import * as Gradient from 'ink-gradient';
import * as BigText from 'ink-big-text';
import { render } from 'ink';

const App = () => (
  <Gradient name="summer">
    <BigText text="crypto cli" align="center" font="chrome" />
  </Gradient>
);

export const r = () => {
  render(<App />);
};
