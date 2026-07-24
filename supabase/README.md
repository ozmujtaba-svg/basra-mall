# إعداد قاعدة بيانات Basra Mall

1. أنشئ مشروعًا في Supabase.
2. افتح SQL Editor وشغّل محتوى `schema.sql` مرة واحدة.
3. انسخ `.env.example` إلى `.env.local`.
4. ضع Project URL وPublishable Key من نافذة Connect.
5. أعد تشغيل خادم Vite.

لا تضع Secret Key أو Service Role Key داخل ملفات Vite أو المتصفح. التطبيق يستخدم
Publishable Key فقط، والحماية تعتمد على سياسات Row Level Security الموجودة في المخطط.
