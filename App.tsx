import {
  PublicSans_400Regular,
  PublicSans_500Medium,
  PublicSans_600SemiBold,
  PublicSans_700Bold,
  useFonts,
} from '@expo-google-fonts/public-sans';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  OFFICIAL_SOURCE_URL,
  PASS_MARK,
  PRACTICE_TEST_SIZE,
  QUESTIONS,
  Question,
  QuestionCategory,
  REQUIRED_VALUES_CORRECT,
} from './src/questions';

type Mode = 'test' | 'all';
type Phase = 'intro' | 'quiz' | 'results';
type StoredBest = {
  bestScore: number;
  attempts: number;
};

const STORAGE_KEY = 'australain-citizenship-practice-v1';

const COLORS = {
  background: '#F4F7FB',
  surface: '#FFFFFF',
  panel: '#EAF1F7',
  border: '#D7E1EA',
  text: '#142433',
  muted: '#667789',
  primary: '#0F5B78',
  primaryDark: '#113A5D',
  accent: '#E0A22F',
  green: '#1B7F5C',
  greenSoft: '#E4F5EC',
  red: '#B54438',
  redSoft: '#FCE9E6',
  white: '#FFFFFF',
};

const CATEGORY_ORDER: QuestionCategory[] = [
  'Test Rules',
  'Australia and its People',
  'Symbols and Days',
  'Democratic Beliefs',
  'Citizenship',
  'Government and Law',
  'Australian Values',
];

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function buildQuestionSet(mode: Mode): Question[] {
  if (mode === 'all') {
    return shuffle(QUESTIONS);
  }

  const values = shuffle(QUESTIONS.filter((question) => question.valuesQuestion)).slice(0, REQUIRED_VALUES_CORRECT);
  const general = shuffle(QUESTIONS.filter((question) => !question.valuesQuestion)).slice(
    0,
    PRACTICE_TEST_SIZE - REQUIRED_VALUES_CORRECT,
  );

  return shuffle([...values, ...general]);
}

function percent(score: number, total: number) {
  return total === 0 ? 0 : Math.round((score / total) * 100);
}

function categoryCounts() {
  return CATEGORY_ORDER.map((category) => ({
    category,
    count: QUESTIONS.filter((question) => question.category === category).length,
  }));
}

export default function App() {
  const [fontsLoaded] = useFonts({
    PublicSans_400Regular,
    PublicSans_500Medium,
    PublicSans_600SemiBold,
    PublicSans_700Bold,
  });
  const [mode, setMode] = useState<Mode>('test');
  const [phase, setPhase] = useState<Phase>('intro');
  const [quiz, setQuiz] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [best, setBest] = useState<StoredBest>({ bestScore: 0, attempts: 0 });

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (value) {
          setBest(JSON.parse(value) as StoredBest);
        }
      })
      .catch(() => undefined);
  }, []);

  const current = quiz[index];
  const selected = current ? answers[current.id] : undefined;
  const answered = selected !== undefined;
  const score = useMemo(
    () => quiz.reduce((total, question) => total + (answers[question.id] === question.answerIndex ? 1 : 0), 0),
    [answers, quiz],
  );
  const valuesTotal = quiz.filter((question) => question.valuesQuestion).length;
  const valuesCorrect = quiz.reduce(
    (total, question) =>
      total + (question.valuesQuestion && answers[question.id] === question.answerIndex ? 1 : 0),
    0,
  );
  const finalPercent = percent(score, quiz.length);
  const passed =
    quiz.length > 0 &&
    finalPercent >= PASS_MARK &&
    (mode === 'all' || valuesCorrect === REQUIRED_VALUES_CORRECT);

  const startQuiz = (nextMode: Mode = mode) => {
    setMode(nextMode);
    setQuiz(buildQuestionSet(nextMode));
    setAnswers({});
    setIndex(0);
    setPhase('quiz');
  };

  const finishQuiz = async () => {
    const nextBest = {
      bestScore: Math.max(best.bestScore, finalPercent),
      attempts: best.attempts + 1,
    };
    setBest(nextBest);
    setPhase('results');
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextBest)).catch(() => undefined);
  };

  const chooseAnswer = (answerIndex: number) => {
    if (!current || answered) {
      return;
    }
    setAnswers((previous) => ({ ...previous, [current.id]: answerIndex }));
  };

  const goNext = () => {
    if (index + 1 >= quiz.length) {
      void finishQuiz();
      return;
    }
    setIndex((value) => value + 1);
  };

  if (!fontsLoaded) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.loading}>
          <Text style={styles.loadingText}>Loading practice test...</Text>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SafeAreaView style={styles.shell}>
        {phase === 'intro' && (
          <ScrollView contentContainerStyle={styles.introContent}>
            <View style={styles.hero}>
              <View style={styles.heroTop}>
                <View style={styles.appIcon}>
                  <MaterialIcons name="school" size={28} color={COLORS.white} />
                </View>
                <Pressable style={styles.sourceButton} onPress={() => Linking.openURL(OFFICIAL_SOURCE_URL)}>
                  <MaterialIcons name="open-in-new" size={18} color={COLORS.white} />
                  <Text style={styles.sourceText}>Official source</Text>
                </Pressable>
              </View>
              <Text style={styles.eyebrow}>Australian citizenship practice</Text>
              <Text style={styles.title}>Australain Citizenship Test Practice</Text>
              <Text style={styles.subtitle}>
                Practice with questions built from the testable section of Our Common Bond. Get instant feedback,
                review the right answer, and repeat until the rules feel familiar.
              </Text>
            </View>

            <View style={styles.statsRow}>
              <Metric value={QUESTIONS.length.toString()} label="Questions" />
              <Metric value={QUESTIONS.filter((item) => item.valuesQuestion).length.toString()} label="Values" />
              <Metric value={`${best.bestScore}%`} label="Best score" />
            </View>

            <View style={styles.segment}>
              <ModeButton
                active={mode === 'test'}
                title="20 question test"
                detail="Official style"
                icon="quiz"
                onPress={() => setMode('test')}
              />
              <ModeButton
                active={mode === 'all'}
                title="Full bank"
                detail="Every question"
                icon="view-list"
                onPress={() => setMode('all')}
              />
            </View>

            <Pressable style={styles.primaryButton} onPress={() => startQuiz()}>
              <MaterialIcons name="play-arrow" size={22} color={COLORS.white} />
              <Text style={styles.primaryButtonText}>Start practice</Text>
            </Pressable>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Question coverage</Text>
              {categoryCounts().map((item) => (
                <View key={item.category} style={styles.coverageRow}>
                  <Text style={styles.coverageLabel}>{item.category}</Text>
                  <Text style={styles.coverageCount}>{item.count}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        {phase === 'quiz' && current && (
          <View style={styles.quizLayout}>
            <View style={styles.topBar}>
              <Pressable style={styles.iconButton} onPress={() => setPhase('intro')}>
                <MaterialIcons name="close" size={22} color={COLORS.primaryDark} />
              </Pressable>
              <View style={styles.progressMeta}>
                <Text style={styles.progressText}>
                  Question {index + 1} of {quiz.length}
                </Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${((index + 1) / quiz.length) * 100}%` }]} />
                </View>
              </View>
              <View style={styles.scorePill}>
                <Text style={styles.scorePillText}>{score}</Text>
              </View>
            </View>

            <ScrollView contentContainerStyle={styles.questionContent}>
              <View style={styles.categoryLine}>
                <Text style={styles.categoryText}>{current.category}</Text>
                {current.valuesQuestion && <Text style={styles.valuesBadge}>Values</Text>}
              </View>
              <Text style={styles.questionText}>{current.prompt}</Text>

              <View style={styles.options}>
                {current.options.map((option, optionIndex) => {
                  const isCorrect = optionIndex === current.answerIndex;
                  const isSelected = selected === optionIndex;
                  const showCorrect = answered && isCorrect;
                  const showWrong = answered && isSelected && !isCorrect;
                  return (
                    <Pressable
                      key={option}
                      style={[
                        styles.option,
                        isSelected && styles.optionSelected,
                        showCorrect && styles.optionCorrect,
                        showWrong && styles.optionWrong,
                      ]}
                      onPress={() => chooseAnswer(optionIndex)}
                    >
                      <View
                        style={[
                          styles.optionLetter,
                          showCorrect && styles.optionLetterCorrect,
                          showWrong && styles.optionLetterWrong,
                        ]}
                      >
                        <Text style={styles.optionLetterText}>{String.fromCharCode(65 + optionIndex)}</Text>
                      </View>
                      <Text style={styles.optionText}>{option}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {answered && (
                <View style={[styles.feedback, selected === current.answerIndex ? styles.feedbackGood : styles.feedbackBad]}>
                  <View style={styles.feedbackTitleRow}>
                    <MaterialIcons
                      name={selected === current.answerIndex ? 'check-circle' : 'cancel'}
                      size={22}
                      color={selected === current.answerIndex ? COLORS.green : COLORS.red}
                    />
                    <Text style={styles.feedbackTitle}>
                      {selected === current.answerIndex ? 'Correct' : 'Wrong'}
                    </Text>
                  </View>
                  <Text style={styles.feedbackBody}>
                    Correct answer: {current.options[current.answerIndex]}. {current.explanation}
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.footer}>
              <Pressable style={[styles.nextButton, !answered && styles.nextButtonDisabled]} disabled={!answered} onPress={goNext}>
                <Text style={styles.nextButtonText}>{index + 1 >= quiz.length ? 'See results' : 'Next question'}</Text>
                <MaterialIcons name="arrow-forward" size={20} color={COLORS.white} />
              </Pressable>
            </View>
          </View>
        )}

        {phase === 'results' && (
          <ScrollView contentContainerStyle={styles.resultsContent}>
            <View style={[styles.resultHero, passed ? styles.resultHeroPass : styles.resultHeroReview]}>
              <MaterialIcons name={passed ? 'verified' : 'fact-check'} size={40} color={COLORS.white} />
              <Text style={styles.resultScore}>{finalPercent}%</Text>
              <Text style={styles.resultTitle}>{passed ? 'Practice test passed' : 'Keep practising'}</Text>
              <Text style={styles.resultBody}>
                You answered {score} of {quiz.length} correctly.
                {mode === 'test'
                  ? ` Values questions: ${valuesCorrect} of ${valuesTotal} correct.`
                  : ' Full-bank mode does not apply the official pass rule.'}
              </Text>
            </View>

            <View style={styles.statsRow}>
              <Metric value={`${score}/${quiz.length}`} label="Correct" />
              <Metric value={`${valuesCorrect}/${valuesTotal}`} label="Values" />
              <Metric value={best.attempts.toString()} label="Attempts" />
            </View>

            <View style={styles.actionGrid}>
              <Pressable style={styles.primaryButton} onPress={() => startQuiz(mode)}>
                <MaterialIcons name="replay" size={22} color={COLORS.white} />
                <Text style={styles.primaryButtonText}>Repeat</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={() => setPhase('intro')}>
                <MaterialIcons name="home" size={21} color={COLORS.primaryDark} />
                <Text style={styles.secondaryButtonText}>Home</Text>
              </Pressable>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Review</Text>
              {quiz.map((question, questionIndex) => {
                const wasCorrect = answers[question.id] === question.answerIndex;
                return (
                  <View key={question.id} style={styles.reviewItem}>
                    <View style={[styles.reviewIcon, wasCorrect ? styles.reviewIconGood : styles.reviewIconBad]}>
                      <MaterialIcons name={wasCorrect ? 'check' : 'close'} size={16} color={COLORS.white} />
                    </View>
                    <View style={styles.reviewTextWrap}>
                      <Text style={styles.reviewPrompt}>
                        {questionIndex + 1}. {question.prompt}
                      </Text>
                      <Text style={styles.reviewAnswer}>Answer: {question.options[question.answerIndex]}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function ModeButton({
  active,
  title,
  detail,
  icon,
  onPress,
}: {
  active: boolean;
  title: string;
  detail: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.modeButton, active && styles.modeButtonActive]} onPress={onPress}>
      <MaterialIcons name={icon} size={22} color={active ? COLORS.white : COLORS.primaryDark} />
      <View>
        <Text style={[styles.modeTitle, active && styles.modeTitleActive]}>{title}</Text>
        <Text style={[styles.modeDetail, active && styles.modeDetailActive]}>{detail}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    color: COLORS.primaryDark,
    fontFamily: 'PublicSans_600SemiBold',
  },
  introContent: {
    padding: 18,
    paddingBottom: 32,
    gap: 16,
    width: '100%',
    maxWidth: 860,
    alignSelf: 'center',
  },
  hero: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: 8,
    padding: 22,
    gap: 12,
    overflow: 'hidden',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  appIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  sourceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  sourceText: {
    color: COLORS.white,
    fontFamily: 'PublicSans_600SemiBold',
    fontSize: 13,
  },
  eyebrow: {
    color: COLORS.accent,
    fontFamily: 'PublicSans_700Bold',
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 0,
    marginTop: 8,
  },
  title: {
    color: COLORS.white,
    fontFamily: 'PublicSans_700Bold',
    fontSize: 34,
    lineHeight: 40,
  },
  subtitle: {
    color: '#D9E7F1',
    fontFamily: 'PublicSans_400Regular',
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 690,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metric: {
    flex: 1,
    minHeight: 74,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    padding: 12,
    justifyContent: 'center',
  },
  metricValue: {
    fontFamily: 'PublicSans_700Bold',
    color: COLORS.primaryDark,
    fontSize: 24,
  },
  metricLabel: {
    fontFamily: 'PublicSans_500Medium',
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 2,
  },
  segment: {
    flexDirection: 'row',
    gap: 10,
  },
  modeButton: {
    flex: 1,
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    padding: 12,
  },
  modeButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  modeTitle: {
    color: COLORS.primaryDark,
    fontFamily: 'PublicSans_700Bold',
    fontSize: 14,
  },
  modeTitleActive: {
    color: COLORS.white,
  },
  modeDetail: {
    color: COLORS.muted,
    fontFamily: 'PublicSans_500Medium',
    fontSize: 12,
    marginTop: 2,
  },
  modeDetailActive: {
    color: '#D9E7F1',
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontFamily: 'PublicSans_700Bold',
    fontSize: 16,
  },
  secondaryButton: {
    minHeight: 54,
    borderRadius: 8,
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: COLORS.primaryDark,
    fontFamily: 'PublicSans_700Bold',
    fontSize: 16,
  },
  card: {
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },
  cardTitle: {
    color: COLORS.primaryDark,
    fontFamily: 'PublicSans_700Bold',
    fontSize: 18,
    marginBottom: 8,
  },
  coverageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  coverageLabel: {
    color: COLORS.text,
    fontFamily: 'PublicSans_500Medium',
    flex: 1,
  },
  coverageCount: {
    color: COLORS.primary,
    fontFamily: 'PublicSans_700Bold',
    marginLeft: 12,
  },
  quizLayout: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: COLORS.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressMeta: {
    flex: 1,
    gap: 8,
  },
  progressText: {
    color: COLORS.primaryDark,
    fontFamily: 'PublicSans_700Bold',
    fontSize: 14,
  },
  progressTrack: {
    height: 8,
    borderRadius: 8,
    backgroundColor: COLORS.panel,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    borderRadius: 8,
    backgroundColor: COLORS.accent,
  },
  scorePill: {
    minWidth: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: COLORS.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scorePillText: {
    color: COLORS.white,
    fontFamily: 'PublicSans_700Bold',
  },
  questionContent: {
    width: '100%',
    maxWidth: 820,
    alignSelf: 'center',
    padding: 18,
    paddingBottom: 110,
  },
  categoryLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  categoryText: {
    color: COLORS.primary,
    fontFamily: 'PublicSans_700Bold',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  valuesBadge: {
    color: COLORS.primaryDark,
    backgroundColor: '#F7E6BE',
    overflow: 'hidden',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontFamily: 'PublicSans_700Bold',
    fontSize: 12,
  },
  questionText: {
    color: COLORS.text,
    fontFamily: 'PublicSans_700Bold',
    fontSize: 28,
    lineHeight: 36,
    marginBottom: 20,
  },
  options: {
    gap: 10,
  },
  option: {
    minHeight: 62,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
  },
  optionSelected: {
    borderColor: COLORS.primary,
  },
  optionCorrect: {
    borderColor: COLORS.green,
    backgroundColor: COLORS.greenSoft,
  },
  optionWrong: {
    borderColor: COLORS.red,
    backgroundColor: COLORS.redSoft,
  },
  optionLetter: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: COLORS.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLetterCorrect: {
    backgroundColor: COLORS.green,
  },
  optionLetterWrong: {
    backgroundColor: COLORS.red,
  },
  optionLetterText: {
    color: COLORS.primaryDark,
    fontFamily: 'PublicSans_700Bold',
  },
  optionText: {
    flex: 1,
    color: COLORS.text,
    fontFamily: 'PublicSans_600SemiBold',
    fontSize: 16,
    lineHeight: 22,
  },
  feedback: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
    marginTop: 18,
    gap: 8,
  },
  feedbackGood: {
    backgroundColor: COLORS.greenSoft,
    borderColor: '#A9DFC5',
  },
  feedbackBad: {
    backgroundColor: COLORS.redSoft,
    borderColor: '#F1B6AE',
  },
  feedbackTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feedbackTitle: {
    color: COLORS.primaryDark,
    fontFamily: 'PublicSans_700Bold',
    fontSize: 17,
  },
  feedbackBody: {
    color: COLORS.text,
    fontFamily: 'PublicSans_500Medium',
    lineHeight: 22,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  nextButton: {
    maxWidth: 820,
    width: '100%',
    alignSelf: 'center',
    minHeight: 54,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    color: COLORS.white,
    fontFamily: 'PublicSans_700Bold',
    fontSize: 16,
  },
  resultsContent: {
    padding: 18,
    paddingBottom: 34,
    gap: 16,
    width: '100%',
    maxWidth: 860,
    alignSelf: 'center',
  },
  resultHero: {
    borderRadius: 8,
    padding: 22,
    alignItems: 'center',
    gap: 8,
  },
  resultHeroPass: {
    backgroundColor: COLORS.green,
  },
  resultHeroReview: {
    backgroundColor: COLORS.primaryDark,
  },
  resultScore: {
    color: COLORS.white,
    fontFamily: 'PublicSans_700Bold',
    fontSize: 52,
    lineHeight: 60,
  },
  resultTitle: {
    color: COLORS.white,
    fontFamily: 'PublicSans_700Bold',
    fontSize: 22,
  },
  resultBody: {
    color: '#E8F2F7',
    textAlign: 'center',
    fontFamily: 'PublicSans_500Medium',
    lineHeight: 22,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  reviewItem: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  reviewIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  reviewIconGood: {
    backgroundColor: COLORS.green,
  },
  reviewIconBad: {
    backgroundColor: COLORS.red,
  },
  reviewTextWrap: {
    flex: 1,
    gap: 4,
  },
  reviewPrompt: {
    color: COLORS.text,
    fontFamily: 'PublicSans_600SemiBold',
    lineHeight: 21,
  },
  reviewAnswer: {
    color: COLORS.muted,
    fontFamily: 'PublicSans_500Medium',
    lineHeight: 20,
  },
});
