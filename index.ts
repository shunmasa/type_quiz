interface QuizOptions<T> {
  numberOfQuestions: number;
  difficulty: string;
  category: number;
  data: T[];
}

interface Question<T> {
  question: T;
  correct_answer: T;
  incorrect_answers: T[];
}

class OpenTriviaResponse<T> {
  results: Question<T>[] = [];
}

class Quiz<T> {
  private options: QuizOptions<T>;
  private rl: import('readline').Interface;

  constructor(options: QuizOptions<T>, rl: import('readline').Interface) {
    this.options = options;
    this.rl = rl;
  }

  private shuffleArray(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  private questionPrompt(question: string, choices: T[]): Promise<number> {
    return new Promise((resolve) => {
      console.log(question);

      choices.forEach((choice, index) => console.log(`${index + 1}. ${choice}`));

      this.rl.question('Your Answer: ', (userAnswer) => {
        resolve(parseInt(userAnswer, 10));
      });
    });
  }

  async fetchQuizQuestions(): Promise<Question<T>[]> {
    const quizApiUrl = `https://opentdb.com/api.php?amount=${this.options.numberOfQuestions}&category=${this.options.category}&difficulty=${this.options.difficulty}&type=multiple`;

    try {
      const response = await fetch(quizApiUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch quiz questions. Status: ${response.status}`);
      }

      const data: OpenTriviaResponse<T> = await response.json();
      return data.results;
    } catch (error) {
      if (error instanceof Error) {
        console.error('Failed to fetch quiz questions:', error.message);
      }
      return [];
    }
  }

  async runQuiz(questions: Question<T>[]): Promise<void> {
    let score = 0;
    let correctAnswers = 0;
    let incorrectAnswers = 0;

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const choices = this.shuffleArray([...question.incorrect_answers, question.correct_answer]);

      const userAnswerIndex = await this.questionPrompt(`Question ${i + 1}: ${question.question}`, choices);

      if (!isNaN(userAnswerIndex) && userAnswerIndex >= 1 && userAnswerIndex <= choices.length) {
        const selectedChoice = choices[userAnswerIndex - 1];
        if (selectedChoice === question.correct_answer) {
          console.log('Correct!\n');
          score += 1;
          correctAnswers += 1;
        } else {
          console.log(`Incorrect. The correct answer is: ${question.correct_answer}\n`);
          incorrectAnswers += 1;
        }
      } else {
        console.log('Invalid choice. Skipping question.\n');
        incorrectAnswers += 1;
      }
    }

    const totalQuestions = questions.length;
    const correctPercentage = (correctAnswers / totalQuestions) * 100;
    const incorrectPercentage = (incorrectAnswers / totalQuestions) * 100;

    console.log(
      `Quiz completed. Your score: ${score}/${totalQuestions} (${correctPercentage}% correct, ${incorrectPercentage}% incorrect)`
    );

    this.rl.close();
  }
}

async function main(): Promise<void> {
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const options: QuizOptions<string> = {
    numberOfQuestions: parseInt(await questionPrompt(rl, 'Enter the number of questions: '), 10),
    difficulty: await difficultyPrompt(rl),
    category: await categoryPrompt(rl),
    data: [],
  };

  const quiz = new Quiz<string>(options, rl);
  const quizQuestions = await quiz.fetchQuizQuestions();

  await quiz.runQuiz(quizQuestions);
}

function questionPrompt(rl: import('readline').Interface, prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function difficultyPrompt(rl: import('readline').Interface): Promise<string> {
  return questionPrompt(rl, 'Enter the difficulty (easy, medium, hard): ');
}

function categoryPrompt(rl: import('readline').Interface): Promise<number> {
  return questionPrompt(
    rl,
    'Choose a category:\n9. General Knowledge\n14. TV\n10. Books\n12. Music\n11. Film\n'
  ).then((category) => parseInt(category, 10));
}

main();
