import { useEffect, useState } from 'react';

import { fetchKnowledgeQuizPlatformSettings } from './knowledge-quiz-platform-settings';

export function useKnowledgeQuizPlatformSettings() {
  const [secondsPerQuestion, setSecondsPerQuestion] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    void fetchKnowledgeQuizPlatformSettings()
      .then((data) => {
        if (!cancelled) {
          setSecondsPerQuestion(data.quizTimePerQuestionSeconds);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSecondsPerQuestion(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return secondsPerQuestion;
}
