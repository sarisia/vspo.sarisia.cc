import { InView } from "react-intersection-observer";
import { DailyStream } from "@types";
import { Button } from "@/components/ui/button";
import { DateLabel } from "../dateLabel";
import { DummyStreamCard, StreamCard } from "../streamCard";
import { useStreamGirdList } from "./viewModel";

function DailyStreamGrid({ date, streams }: DailyStream) {
  return (
    <div>
      <DateLabel dateString={date} />
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 ">
        {streams.map((stream) => (
          <InView key={stream.id}>
            {({ ref, inView }) => (
              <div ref={ref} className="flex justify-center">
                {inView ? <StreamCard stream={stream} /> : <DummyStreamCard />}
              </div>
            )}
          </InView>
        ))}
      </div>
    </div>
  );
}

export function StreamGridList() {
  const { dailyStreams, isDisplayHistory, loadOlderHistory } =
    useStreamGirdList();

  return (
    <div className="px-5 lg:px-15 pb-8">
      {dailyStreams.map(({ date, streams }) => (
        <DailyStreamGrid key={date} date={date} streams={streams} />
      ))}
      {isDisplayHistory && (
        <div className="flex justify-center py-6">
          <Button variant="secondary" onClick={loadOlderHistory}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
