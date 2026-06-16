-- Тесты (квизы) к материалам базы знаний

CREATE TABLE IF NOT EXISTS "knowledge_material_quizzes" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Проверка знаний',
    "passingScorePercent" INTEGER NOT NULL DEFAULT 80,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_material_quizzes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "knowledge_material_quizzes_materialId_key"
    ON "knowledge_material_quizzes"("materialId");

ALTER TABLE "knowledge_material_quizzes"
    ADD CONSTRAINT "knowledge_material_quizzes_materialId_fkey"
    FOREIGN KEY ("materialId") REFERENCES "knowledge_materials"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "knowledge_quiz_questions" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "text" TEXT NOT NULL,
    "explanation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_quiz_questions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "knowledge_quiz_questions_quizId_idx"
    ON "knowledge_quiz_questions"("quizId");

ALTER TABLE "knowledge_quiz_questions"
    ADD CONSTRAINT "knowledge_quiz_questions_quizId_fkey"
    FOREIGN KEY ("quizId") REFERENCES "knowledge_material_quizzes"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "knowledge_quiz_options" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_quiz_options_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "knowledge_quiz_options_questionId_idx"
    ON "knowledge_quiz_options"("questionId");

ALTER TABLE "knowledge_quiz_options"
    ADD CONSTRAINT "knowledge_quiz_options_questionId_fkey"
    FOREIGN KEY ("questionId") REFERENCES "knowledge_quiz_questions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "knowledge_quiz_attempts" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scorePercent" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "answers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_quiz_attempts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "knowledge_quiz_attempts_materialId_userId_idx"
    ON "knowledge_quiz_attempts"("materialId", "userId");
CREATE INDEX IF NOT EXISTS "knowledge_quiz_attempts_userId_idx"
    ON "knowledge_quiz_attempts"("userId");
CREATE INDEX IF NOT EXISTS "knowledge_quiz_attempts_quizId_idx"
    ON "knowledge_quiz_attempts"("quizId");

ALTER TABLE "knowledge_quiz_attempts"
    ADD CONSTRAINT "knowledge_quiz_attempts_quizId_fkey"
    FOREIGN KEY ("quizId") REFERENCES "knowledge_material_quizzes"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "knowledge_quiz_attempts"
    ADD CONSTRAINT "knowledge_quiz_attempts_materialId_fkey"
    FOREIGN KEY ("materialId") REFERENCES "knowledge_materials"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "knowledge_quiz_attempts"
    ADD CONSTRAINT "knowledge_quiz_attempts_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Квиз для статьи «Особенности B2C-продаж…»
DO $$
DECLARE
    mat_id TEXT;
    quiz_id TEXT := 'kq_b2c_sales_01';
BEGIN
    SELECT id INTO mat_id
    FROM "knowledge_materials"
    WHERE slug = 'b2c-prodazhi-remont-osteklenie'
    LIMIT 1;

    IF mat_id IS NULL THEN
        RETURN;
    END IF;

    INSERT INTO "knowledge_material_quizzes" ("id", "materialId", "title", "passingScorePercent", "updatedAt")
    VALUES (quiz_id, mat_id, 'Тестовые вопросы (для самопроверки)', 80, CURRENT_TIMESTAMP)
    ON CONFLICT ("materialId") DO NOTHING;

    INSERT INTO "knowledge_quiz_questions" ("id", "quizId", "sortOrder", "text", "explanation", "updatedAt")
    VALUES
        ('kq_b2c_q01', quiz_id, 1,
         'Почему в B2C-продажах окон важно начинать разговор с проблем клиента, а не с перечисления характеристик?',
         'Проблемы вызывают эмоциональный отклик, а эмоции двигают решение о покупке.',
         CURRENT_TIMESTAMP),
        ('kq_b2c_q02', quiz_id, 2,
         'Клиент говорит: «Я хочу посоветоваться с женой, позвоню завтра». Как правильно реагировать?',
         'Согласитесь, предложите прислать сравнительную таблицу и договоритесь о следующем контакте через день.',
         CURRENT_TIMESTAMP),
        ('kq_b2c_q03', quiz_id, 3,
         'Что из перечисленного НЕ является проявлением страха клиента ошибиться?',
         'Желание сразу оплатить 100% предоплаты — скорее признак готовности, а не страха ошибиться.',
         CURRENT_TIMESTAMP),
        ('kq_b2c_q04', quiz_id, 4,
         'Какая фраза лучше всего отражает принцип upsell (предложение улучшенной версии)?',
         'Рекомендация с конкретной выгодой для клиента — основа грамотного upsell.',
         CURRENT_TIMESTAMP),
        ('kq_b2c_q05', quiz_id, 5,
         'Почему важно звонить клиенту через неделю после монтажа?',
         'Это проверка качества, сбор обратной связи и основа для рекомендаций.',
         CURRENT_TIMESTAMP)
    ON CONFLICT ("id") DO NOTHING;

    INSERT INTO "knowledge_quiz_options" ("id", "questionId", "sortOrder", "text", "isCorrect", "updatedAt")
    VALUES
        ('kq_b2c_q01_a', 'kq_b2c_q01', 1, 'Это занимает больше времени и позволяет продавцу казаться занятым.', false, CURRENT_TIMESTAMP),
        ('kq_b2c_q01_b', 'kq_b2c_q01', 2, 'Проблемы вызывают эмоциональный отклик, а эмоции двигают решение о покупке.', true, CURRENT_TIMESTAMP),
        ('kq_b2c_q01_c', 'kq_b2c_q01', 3, 'Характеристики окон запрещено обсуждать до подписания договора.', false, CURRENT_TIMESTAMP),

        ('kq_b2c_q02_a', 'kq_b2c_q02', 1, 'Настоять на немедленном подписании, предложив скидку «только сегодня».', false, CURRENT_TIMESTAMP),
        ('kq_b2c_q02_b', 'kq_b2c_q02', 2, 'Согласиться, предложить прислать сравнительную таблицу и договориться о следующем контакте через день.', true, CURRENT_TIMESTAMP),
        ('kq_b2c_q02_c', 'kq_b2c_q02', 3, 'Сказать, что у вас нет времени ждать, и переключиться на другого клиента.', false, CURRENT_TIMESTAMP),

        ('kq_b2c_q03_a', 'kq_b2c_q03', 1, 'Просьба показать сертификаты на продукцию.', false, CURRENT_TIMESTAMP),
        ('kq_b2c_q03_b', 'kq_b2c_q03', 2, 'Вопрос о возможности приехать на объект и посмотреть готовый монтаж.', false, CURRENT_TIMESTAMP),
        ('kq_b2c_q03_c', 'kq_b2c_q03', 3, 'Желание сразу оплатить 100% предоплаты.', true, CURRENT_TIMESTAMP),

        ('kq_b2c_q04_a', 'kq_b2c_q04', 1, '«Можете взять самое дешевое, но тогда сэкономите немного».', false, CURRENT_TIMESTAMP),
        ('kq_b2c_q04_b', 'kq_b2c_q04', 2, '«Рекомендую обратить внимание на стеклопакет с мультифункциональным покрытием – он экономит до 30% тепла и защищает от выгорания мебели».', true, CURRENT_TIMESTAMP),
        ('kq_b2c_q04_c', 'kq_b2c_q04', 3, '«Мы не навязываем дополнительных услуг, выбирайте по своему желанию».', false, CURRENT_TIMESTAMP),

        ('kq_b2c_q05_a', 'kq_b2c_q05', 1, 'Чтобы напомнить о необходимости доплаты.', false, CURRENT_TIMESTAMP),
        ('kq_b2c_q05_b', 'kq_b2c_q05', 2, 'Чтобы проверить качество работ, получить обратную связь и создать основу для будущих рекомендаций.', true, CURRENT_TIMESTAMP),
        ('kq_b2c_q05_c', 'kq_b2c_q05', 3, 'Чтобы предложить скидку на следующую покупку только сегодня.', false, CURRENT_TIMESTAMP)
    ON CONFLICT ("id") DO NOTHING;
END $$;
