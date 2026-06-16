-- Модули внутри категорий базы знаний

CREATE TABLE IF NOT EXISTS "knowledge_modules" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_modules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "knowledge_modules_categoryId_slug_key"
    ON "knowledge_modules"("categoryId", "slug");
CREATE INDEX IF NOT EXISTS "knowledge_modules_categoryId_idx"
    ON "knowledge_modules"("categoryId");

ALTER TABLE "knowledge_modules"
    ADD CONSTRAINT "knowledge_modules_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "knowledge_categories"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "knowledge_materials"
    ADD COLUMN IF NOT EXISTS "moduleId" TEXT;

CREATE INDEX IF NOT EXISTS "knowledge_materials_moduleId_idx"
    ON "knowledge_materials"("moduleId");

ALTER TABLE "knowledge_materials"
    ADD CONSTRAINT "knowledge_materials_moduleId_fkey"
    FOREIGN KEY ("moduleId") REFERENCES "knowledge_modules"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Начальные модули для категории «Техника продаж» (если категория существует)
DO $$
DECLARE
    cat_id TEXT;
    author_id TEXT;
    mod1_id TEXT := 'km_sales_mod_01';
    mod2_id TEXT := 'km_sales_mod_02';
    mod3_id TEXT := 'km_sales_mod_03';
    mod4_id TEXT := 'km_sales_mod_04';
    mod5_id TEXT := 'km_sales_mod_05';
BEGIN
    SELECT id INTO cat_id
    FROM "knowledge_categories"
    WHERE slug = 'tehnika-prodazh'
       OR lower(name) = lower('Техника продаж')
    ORDER BY CASE WHEN slug = 'tehnika-prodazh' THEN 0 ELSE 1 END
    LIMIT 1;

    IF cat_id IS NULL THEN
        cat_id := 'kc_tehnika_prodazh';
        INSERT INTO "knowledge_categories" ("id", "name", "slug", "description", "order", "updatedAt")
        VALUES (
            cat_id,
            'Техника продаж',
            'tehnika-prodazh',
            'Обучающие материалы по продажам для менеджеров',
            10,
            CURRENT_TIMESTAMP
        )
        ON CONFLICT ("slug") DO NOTHING;

        SELECT id INTO cat_id
        FROM "knowledge_categories"
        WHERE slug = 'tehnika-prodazh'
        LIMIT 1;
    END IF;

    IF cat_id IS NULL THEN
        RETURN;
    END IF;

    INSERT INTO "knowledge_modules" ("id", "categoryId", "name", "slug", "description", "order", "updatedAt")
    VALUES
        (mod1_id, cat_id, 'Модуль 1. Базовые основы и психология', 'modul-1-bazovye-osnovy',
         'Вводный блок. Эти темы закладывают правильное мышление.', 1, CURRENT_TIMESTAMP),
        (mod2_id, cat_id, 'Модуль 2. Этапы продаж', 'modul-2-etapy-prodazh',
         'Технология процесса. Структура, без которой продажа превращается в хаос.', 2, CURRENT_TIMESTAMP),
        (mod3_id, cat_id, 'Модуль 3. Работа с возражениями и страхами', 'modul-3-vozrazheniya',
         'Самый важный блок — главная точка роста менеджера.', 3, CURRENT_TIMESTAMP),
        (mod4_id, cat_id, 'Модуль 4. Техники закрытия и увеличения чека', 'modul-4-zakrytie-cheka',
         'Финал сделки и стратегии роста прибыли.', 4, CURRENT_TIMESTAMP),
        (mod5_id, cat_id, 'Модуль 5. Управление клиентской базой и сервис', 'modul-5-klient-baza',
         'Продажи будущего и системность.', 5, CURRENT_TIMESTAMP)
    ON CONFLICT ("categoryId", "slug") DO NOTHING;

    SELECT id INTO author_id
    FROM "users"
    WHERE role IN ('SUPER_ADMIN', 'ADMIN', 'CONTENT_MANAGER')
    ORDER BY CASE role WHEN 'SUPER_ADMIN' THEN 0 WHEN 'ADMIN' THEN 1 ELSE 2 END
    LIMIT 1;

    IF author_id IS NULL THEN
        RETURN;
    END IF;

    INSERT INTO "knowledge_materials" (
        "id", "categoryId", "moduleId", "type", "title", "slug", "excerpt",
        "content", "sortOrder", "status", "authorId", "updatedAt"
    ) VALUES
        ('km_sales_m01_t01', cat_id, mod1_id, 'ARTICLE',
         'Особенности B2C-продаж в сфере ремонта и остекления',
         'b2c-prodazhi-remont-osteklenie',
         'Почему клиент покупает не окно, а комфорт, тишину и безопасность. Портрет современного покупателя стройматериалов.',
         NULL, 1, 'DRAFT', author_id, CURRENT_TIMESTAMP),
        ('km_sales_m01_t02', cat_id, mod1_id, 'ARTICLE',
         'Психотипы клиентов и адаптация стиля общения',
         'psihotipy-klientov',
         'Визуал, Аудиал, Кинестетик и Дигитал: как определить тип по речи и как строить презентацию под каждого.',
         NULL, 2, 'DRAFT', author_id, CURRENT_TIMESTAMP),
        ('km_sales_m01_t03', cat_id, mod1_id, 'ARTICLE',
         'Эмоциональный интеллект в продажах',
         'emocionalnyj-intellekt-v-prodazhah',
         'Как управлять своим состоянием при отказах и «сложных» клиентах; техники саморегуляции.',
         NULL, 3, 'DRAFT', author_id, CURRENT_TIMESTAMP),
        ('km_sales_m01_t04', cat_id, mod1_id, 'ARTICLE',
         'Профессиональная этика и первый визуальный контакт',
         'prof-ethika-pervyj-kontakt',
         'Внешний вид, голос, приветствие, создание безопасного пространства для клиента.',
         NULL, 4, 'DRAFT', author_id, CURRENT_TIMESTAMP),
        ('km_sales_m02_t01', cat_id, mod2_id, 'ARTICLE',
         'Полный цикл сделки: от лида до отгрузки',
         'polnyj-cikl-sdelki',
         'Общая картина: входящий звонок → встреча/замер → коммерческое предложение → договор → пост-продаж.',
         NULL, 1, 'DRAFT', author_id, CURRENT_TIMESTAMP),
        ('km_sales_m02_t02', cat_id, mod2_id, 'ARTICLE',
         'Этап 1: Установление раппорта и активное слушание',
         'etap-1-rappor-slushanie',
         'Техники «эхо», перефразирование, резюмирование. Как услышать истинную боль клиента.',
         NULL, 2, 'DRAFT', author_id, CURRENT_TIMESTAMP),
        ('km_sales_m02_t03', cat_id, mod2_id, 'ARTICLE',
         'Этап 2: Техника постановки вопросов (SPIN-адаптация для стройки)',
         'etap-2-spin-voprosy',
         'Ситуационные, Проблемные, Извлекающие, Направляющие вопросы. Как выявить скрытые потребности.',
         NULL, 3, 'DRAFT', author_id, CURRENT_TIMESTAMP),
        ('km_sales_m02_t04', cat_id, mod2_id, 'ARTICLE',
         'Этап 3: Структура презентации по методу «ХСВ»',
         'etap-3-hsv-prezentaciya',
         'Характеристика → Свойство → Выгода. Разбор на примерах: продаём не профиль, а тепло и тишину.',
         NULL, 4, 'DRAFT', author_id, CURRENT_TIMESTAMP),
        ('km_sales_m03_t01', cat_id, mod3_id, 'ARTICLE',
         'Классификация возражений: Истинные, ложные и отговорки',
         'klassifikaciya-vozrazhenij',
         'Как отличить «хочу подешевле» от «боюсь ошибиться» и как работать с каждым типом.',
         NULL, 1, 'DRAFT', author_id, CURRENT_TIMESTAMP),
        ('km_sales_m03_t02', cat_id, mod3_id, 'ARTICLE',
         'Алгоритм отработки возражений по методу «Присоединение + Аргумент»',
         'algoritm-vozrazhenij',
         'Универсальная схема: Выслушать → Присоединиться → Задать вопрос → Привести факт.',
         NULL, 2, 'DRAFT', author_id, CURRENT_TIMESTAMP),
        ('km_sales_m03_t03', cat_id, mod3_id, 'ARTICLE',
         'Топ-5 «денежных» возражений и скрипты на них',
         'top5-denezhnyh-vozrazhenij',
         '«У соседей на 30% дешевле», «Слишком дорого для нас», «Мы нашли дешевле в интернете».',
         NULL, 3, 'DRAFT', author_id, CURRENT_TIMESTAMP),
        ('km_sales_m03_t04', cat_id, mod3_id, 'ARTICLE',
         'Работа со страхом «А вдруг обманут?» (Гарантии и надёжность)',
         'strah-obmanut-garantii',
         'Как говорить о гарантии, сроках службы и договоре, чтобы клиент успокоился.',
         NULL, 4, 'DRAFT', author_id, CURRENT_TIMESTAMP),
        ('km_sales_m04_t01', cat_id, mod4_id, 'ARTICLE',
         'Техники завершения сделки (Закрытие)',
         'tehniki-zakrytiya-sdelki',
         'Альтернативный выбор, закрытие на «слабо», метод «предположения согласия», «шоковая цена».',
         NULL, 1, 'DRAFT', author_id, CURRENT_TIMESTAMP),
        ('km_sales_m04_t02', cat_id, mod4_id, 'ARTICLE',
         'Up-sell и Cross-sell в вашей компании',
         'upsell-cross-sell',
         'Как предложить энергосберегающий пакет, премиальную фурнитуру или доп. товары в едином стиле.',
         NULL, 2, 'DRAFT', author_id, CURRENT_TIMESTAMP),
        ('km_sales_m04_t03', cat_id, mod4_id, 'ARTICLE',
         'Создание срочности и работа с дедлайнами (без манипуляций)',
         'srochnost-deadlainy',
         'Как правильно говорить о сроках монтажа, сезонных акциях и дефиците позиций.',
         NULL, 3, 'DRAFT', author_id, CURRENT_TIMESTAMP),
        ('km_sales_m05_t01', cat_id, mod5_id, 'ARTICLE',
         'Пост-продажное обслуживание как инструмент повторных продаж',
         'post-prodazhnoe-obsluzhivanie',
         'Как превратить клиента в «сарафанное радио» через сервис и заботу.',
         NULL, 1, 'DRAFT', author_id, CURRENT_TIMESTAMP),
        ('km_sales_m05_t02', cat_id, mod5_id, 'ARTICLE',
         '(Бонус) Ведение переговоров в мессенджерах и по телефону',
         'peregovory-messendzhery-telefon',
         'Отличие письменной речи от устной, как держать внимание в WhatsApp, правила голосовых сообщений.',
         NULL, 2, 'DRAFT', author_id, CURRENT_TIMESTAMP)
    ON CONFLICT ("slug") DO NOTHING;
END $$;
