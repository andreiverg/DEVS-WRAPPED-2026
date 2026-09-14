import "./wrapped/theme/tokens.css";
import { LiveDOM } from "./wrapped/render-targets/LiveDOM";
import { StoryController } from "./wrapped/engine/StoryController";
import { buildSlideRegistry } from "./wrapped/engine/SlideRegistry";
import { validateWrappedStats } from "./wrapped/data/validate";
import { SAMPLE_STATS } from "./wrapped/dev/sampleStats";

const slides = buildSlideRegistry();
const data = validateWrappedStats(SAMPLE_STATS);

function App() {
  return (
    <LiveDOM>
      <StoryController slides={slides} data={data} />
    </LiveDOM>
  );
}

export default App;
