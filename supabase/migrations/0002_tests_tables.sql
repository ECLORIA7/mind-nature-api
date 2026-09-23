-- ===== テストシステム =====

create table if not exists tests (
  id integer primary key,
  name text not null,
  type integer not null, -- 0=スコア型(AUDIT), 1=正誤型(知識テスト)
  description text
);

create table if not exists test_questions (
  id serial primary key,
  test_id integer not null references tests(id),
  question_order integer not null,
  title text not null
);

create table if not exists test_choices (
  id serial primary key,
  question_id integer not null references test_questions(id),
  choice_order integer not null,
  text text not null,
  is_correct boolean not null default false,
  score integer not null default 0
);

create table if not exists test_grades (
  id serial primary key,
  test_id integer not null references tests(id),
  max_score integer not null,
  grade_text text not null
);

-- カウンセラーがクライアントに割り当てるテスト
create table if not exists patient_tests (
  patient_id uuid not null,
  test_id integer not null references tests(id),
  enabled boolean not null default true,
  assigned_at timestamptz default now(),
  primary key (patient_id, test_id)
);

-- テスト回答結果
create table if not exists test_results (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null,
  test_id integer not null references tests(id),
  attempt_number integer not null,
  answers jsonb not null default '[]',
  score integer not null default 0,
  taken_at timestamptz default now()
);

alter table tests enable row level security;
alter table test_questions enable row level security;
alter table test_choices enable row level security;
alter table test_grades enable row level security;
alter table patient_tests enable row level security;
alter table test_results enable row level security;

-- ===== シードデータ =====

insert into tests (id, name, type) values
(0, 'AUDITスクリーニングテスト', 0),
(1, '条件反射制御法基本理解度テスト', 1),
(2, '制御刺激の理解度テスト', 1),
(3, '疑似行為の理解度テスト', 1),
(4, '想像の理解度テスト', 1),
(5, '維持の理解度テスト', 1)
on conflict (id) do nothing;

-- ===== test0: AUDIT (type=0, スコア型) =====
do $$ declare
  qid int;
  tid int := 0;
begin

insert into test_questions (test_id, question_order, title) values (tid,1,'あなたはアルコール含有飲料をどのくらいの頻度で飲みますか？') returning id into qid;
insert into test_choices (question_id,choice_order,text,score) values (qid,0,'飲まない',0),(qid,1,'１ヶ月に1回以下',1),(qid,2,'１ヶ月に２〜４回',2),(qid,3,'１週間に２〜３回',3),(qid,4,'１週間に４回以上',4);

insert into test_questions (test_id, question_order, title) values (tid,2,'飲酒するときには通常どのくらいの量を飲みますか？') returning id into qid;
insert into test_choices (question_id,choice_order,text,score) values (qid,0,'１〜２ドリンク',0),(qid,1,'３〜４ドリンク',1),(qid,2,'５〜６ドリンク',2),(qid,3,'７〜９ドリンク',3),(qid,4,'１０ドリンク以上',4);

insert into test_questions (test_id, question_order, title) values (tid,3,'１度に６ドリンク以上飲酒することがどのくらいの頻度でありますか？') returning id into qid;
insert into test_choices (question_id,choice_order,text,score) values (qid,0,'ない',0),(qid,1,'１ヶ月に1回あるかないか。',1),(qid,2,'１ヶ月に１回程度',2),(qid,3,'週に一回程度',3),(qid,4,'ほとんど毎日',4);

insert into test_questions (test_id, question_order, title) values (tid,4,'過去１年間に、飲み始めるとやめられなかったことがどれくらいの頻度でありましたか？') returning id into qid;
insert into test_choices (question_id,choice_order,text,score) values (qid,0,'ない',0),(qid,1,'１ヶ月に1回あるかないか。',1),(qid,2,'１ヶ月に１回程度',2),(qid,3,'週に一回程度',3),(qid,4,'ほとんど毎日',4);

insert into test_questions (test_id, question_order, title) values (tid,5,'過去１年間に、普通だと行えることを飲酒していたためにできなかったことが、どのくらいの頻度でありましたか？') returning id into qid;
insert into test_choices (question_id,choice_order,text,score) values (qid,0,'ない',0),(qid,1,'１ヶ月に1回あるかないか。',1),(qid,2,'１ヶ月に１回程度',2),(qid,3,'週に一回程度',3),(qid,4,'ほとんど毎日',4);

insert into test_questions (test_id, question_order, title) values (tid,6,'過去1年間に、深酒の後、体調を整えるために、朝迎え酒をしなければならなかったことがどのくらいの頻度でありましたか？') returning id into qid;
insert into test_choices (question_id,choice_order,text,score) values (qid,0,'ない',0),(qid,1,'１ヶ月に1回あるかないか。',1),(qid,2,'１ヶ月に１回程度',2),(qid,3,'週に一回程度',3),(qid,4,'ほとんど毎日',4);

insert into test_questions (test_id, question_order, title) values (tid,7,'過去1年間に、飲酒後罪悪感や自責の念に駆られたことが、どのくらいの頻度でありましたか？') returning id into qid;
insert into test_choices (question_id,choice_order,text,score) values (qid,0,'ない',0),(qid,1,'１ヶ月に1回あるかないか。',1),(qid,2,'１ヶ月に１回程度',2),(qid,3,'週に一回程度',3),(qid,4,'ほとんど毎日',4);

insert into test_questions (test_id, question_order, title) values (tid,8,'過去1年間に、飲酒のため前夜の出来事を思い出せなかったことが、どのくらいの頻度でありましたか？') returning id into qid;
insert into test_choices (question_id,choice_order,text,score) values (qid,0,'ない',0),(qid,1,'１ヶ月に1回あるかないか。',1),(qid,2,'１ヶ月に１回程度',2),(qid,3,'週に一回程度',3),(qid,4,'ほとんど毎日',4);

insert into test_questions (test_id, question_order, title) values (tid,9,'あなたの飲酒のために、あなた自身や他の誰かが怪我をしたことがありますか？') returning id into qid;
insert into test_choices (question_id,choice_order,text,score) values (qid,0,'ない',0),(qid,1,'あるが過去１年にはなし',2),(qid,2,'過去1年間にある',4);

insert into test_questions (test_id, question_order, title) values (tid,10,'肉親や親戚、友人、医師、あるいは他の健康管理に携わる人が、あなたの飲酒について心配したり、飲酒量を減らすようにすすめたりしたことがありますか？') returning id into qid;
insert into test_choices (question_id,choice_order,text,score) values (qid,0,'ない',0),(qid,1,'あるが過去１年にはなし',2),(qid,2,'過去1年間にある',4);

insert into test_grades (test_id, max_score, grade_text) values
(tid, 7, '今の所、危険の少ない飲み方'),
(tid, 14, '健康や社会生活に影響が出る恐れあり。'),
(tid, 40, 'アルコール使用障害が疑われる飲み方です。');

end $$;

-- ===== test1: 条件反射制御法基本理解度テスト (type=1) =====
do $$ declare
  qid int;
  tid int := 1;
begin

insert into test_questions (test_id,question_order,title) values (tid,1,'人以外の動物が生まれた時にすでに持っている神経活動は次のどれでしょう') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'先天的反射連鎖',true),(qid,1,'後天的反射連鎖',false),(qid,2,'第二信号系反射網',false);

insert into test_questions (test_id,question_order,title) values (tid,2,'人が生まれた時にすでに持っている神経活動は次のどれでしょう') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'先天的反射連鎖',false),(qid,1,'後天的反射連鎖',false),(qid,2,'第二信号系反射網',false);
-- correct: answer index 2 (1-based) => choice_order 1 = 後天的反射連鎖?
-- Let me re-read: test1.txt answer for Q2 is "1" meaning choice 1 (1-based) = 先天的反射連鎖
update test_choices set is_correct=true where question_id=qid and choice_order=0;
update test_choices set is_correct=false where question_id=qid and choice_order!=0;

insert into test_questions (test_id,question_order,title) values (tid,3,'人以外の動物が生まれた後に獲得していく神経活動はどれでしょう。') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'先天的反射連鎖',false),(qid,1,'後天的反射連鎖',true),(qid,2,'第二信号系反射網',false);

insert into test_questions (test_id,question_order,title) values (tid,4,'人が生まれた後に獲得していく神経活動はどれでしょう。（複数）') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'先天的反射連鎖',false),(qid,1,'後天的反射連鎖',true),(qid,2,'第二信号系反射網',true);

insert into test_questions (test_id,question_order,title) values (tid,5,'人以外の動物の行動に関係する神経活動はどれでしょう。（複数）') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'先天的反射連鎖',true),(qid,1,'後天的反射連鎖',true),(qid,2,'第二信号系反射網',false);

insert into test_questions (test_id,question_order,title) values (tid,6,'人の行動に関係する神経活動はどれでしょう。（複数）') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'先天的反射連鎖',true),(qid,1,'後天的反射連鎖',true),(qid,2,'第二信号系反射網',true);

insert into test_questions (test_id,question_order,title) values (tid,7,'人以外の動物は考えて行動するでしょうか。') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'全て考えないで行動する',true),(qid,1,'考える行動と考えない行動がある',false),(qid,2,'全て考えて行動する',false);

insert into test_questions (test_id,question_order,title) values (tid,8,'人は考えて行動するでしょうか。') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'全て考えないで行動する',false),(qid,1,'考える行動と考えない行動がある',true),(qid,2,'全て考えて行動する',false);

insert into test_questions (test_id,question_order,title) values (tid,9,'次のどの神経活動が決まり切った行動を進めるでしょう。（複数）') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'先天的反射連鎖',true),(qid,1,'後天的反射連鎖',true),(qid,2,'第二信号系反射網',false);

insert into test_questions (test_id,question_order,title) values (tid,10,'次のどの神経活動が行動を計画するでしょう') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'先天的反射連鎖',false),(qid,1,'後天的反射連鎖',false),(qid,2,'第二信号系反射網',true);

insert into test_questions (test_id,question_order,title) values (tid,11,'してはならないと決めたことでもしてしまう神経活動はどれでしょう。（複数）') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'先天的反射連鎖',true),(qid,1,'後天的反射連鎖',true),(qid,2,'第二信号系反射網',false);

insert into test_questions (test_id,question_order,title) values (tid,12,'してはならないと考え、やめようとする神経活動は次のどれでしょう。') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'先天的反射連鎖',false),(qid,1,'後天的反射連鎖',false),(qid,2,'第二信号系反射網',true);

insert into test_questions (test_id,question_order,title) values (tid,13,'生理的報酬の説明として、もっとも正しいものを次から一つ選んでください。') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'生理的報酬は行動を活動的にすると得られる',false),(qid,1,'生理的報酬は快感をもたらす全ての物質や行為である',false),(qid,2,'生理的報酬はそれが生じる前の神経活動を定着させる',true);

insert into test_questions (test_id,question_order,title) values (tid,14,'条件反射制御法（CRCT）が働きかける神経活動は次のどれでしょう（複数）') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'先天的反射連鎖',false),(qid,1,'後天的反射連鎖',true),(qid,2,'第二信号系反射網',true);

insert into test_questions (test_id,question_order,title) values (tid,15,'CRCTと反復する問題行動の関係で正しいものは次のどれでしょう') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'CRCTは欲求を抑制するので、必要に応じて、就労の規則性を回復させ、対人関係を良好に保つ治療を受ければ、反復する問題行動は完治する',false),(qid,1,'欲求を抑制する条件反射制御法を受けるだけで、就労も規則性にできるようになり、人間関係もうまくなるので、反復する問題行動は完治する',false),(qid,2,'反復する問題行動は一度成立すると治癒はない',true);

end $$;

-- ===== test2: 制御刺激の理解度テスト =====
do $$ declare
  qid int;
  tid int := 2;
begin

insert into test_questions (test_id,question_order,title) values (tid,1,'制御刺激をするときの要点は次のどれでしょう。') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'〇〇はやらないと念ずる。',false),(qid,1,'〇〇をやらない意志が自分にあることを確認する。',false),(qid,2,'〇〇はやれないという事実を確認する。',true);

insert into test_questions (test_id,question_order,title) values (tid,2,'制御刺激の動作と言葉を繰り返す目的は次のどれでしょう。') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'制御刺激を、〇〇をやらないという意思を強めるものにする。',false),(qid,1,'制御刺激を、〇〇をやらないと決めたことを思い出すものにする。',false),(qid,2,'制御刺激を、〇〇をやれない時間が始まる信号にする。',true);

insert into test_questions (test_id,question_order,title) values (tid,3,'制御刺激の言葉は、声に出しますか、頭の中で思いますか？') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'必ず声に出して言う。',false),(qid,1,'声に出しても良いし、頭の中で思うだけでも良い。',true),(qid,2,'声に出してはいけない。',false);

insert into test_questions (test_id,question_order,title) values (tid,4,'制御刺激をするとき、目は開けておくでしょうか、閉じるでしょうか。') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'目は閉じて制御刺激をする。',false),(qid,1,'目は開けたまま、制御刺激をする',true),(qid,2,'薄目を開けて、制御刺激をする。',false);

insert into test_questions (test_id,question_order,title) values (tid,5,'制御刺激をするのは〇〇に対する欲求があるときでしょうか。') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'欲求があるときに制御刺激をする',false),(qid,1,'欲求がないときに制御刺激をする',false),(qid,2,'欲求があってもなくても制御刺激をする',true);

insert into test_questions (test_id,question_order,title) values (tid,6,'制御刺激と次の制御刺激の時間間隔はどのようにしますか？') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'時間間隔はだいたい20分にする。',false),(qid,1,'時間間隔は20分以下にする。',false),(qid,2,'時間間隔は20分以上にする。',true);

insert into test_questions (test_id,question_order,title) values (tid,7,'問題行動をとめる制御刺激を行なって、その数分後に問題行動に関するニュースやコマーシャルを見たり、問題行動を誘われたらどうしますか。') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'制御刺激の動作を行いながら制御刺激の言葉を思う、あるいは言う。',false),(qid,1,'制御刺激の動作はしない、〇〇がやれないことを確認する。',false),(qid,2,'制御刺激の動作をする。制御刺激の言葉は思わないし、言わない。',true);

insert into test_questions (test_id,question_order,title) values (tid,8,'制御刺激は制御刺激ステージでは１日に何回程度するのが良いでしょうか。') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'5回以上。',false),(qid,1,'10回以上。',false),(qid,2,'20回以上。',true);

insert into test_questions (test_id,question_order,title) values (tid,9,'制御刺激はする場所はどこでしょうか？') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'決めた一つの場所。',false),(qid,1,'やるところとやらないところを決めとく。',false),(qid,2,'通常、生活する全ての場所。',true);

insert into test_questions (test_id,question_order,title) values (tid,10,'他の治療と制御刺激の時間間隔はどうするべきでしょう。') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'制御刺激は過去の問題行動を書き出す描写文の直前にして良い。',false),(qid,1,'制御刺激は過去の問題行動を思い出すミーティングの直前にして良い。',false),(qid,2,'制御刺激は問題行動の描写分を書いたり、面談の直前にしてはならない。',true);

insert into test_questions (test_id,question_order,title) values (tid,11,'制御刺激が簡単にできるようになったら、どうするべきでしょうか。') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'制御刺激が完全に脳に組み込まれたからもうしなくて良い。',false),(qid,1,'意識して行うために、別の制御刺激に変える。',false),(qid,2,'その制御刺激をますます強めるために、同じ制御刺激を続ける。',true);

end $$;

-- ===== test3: 疑似行為の理解度テスト =====
do $$ declare
  qid int;
  tid int := 3;
begin

insert into test_questions (test_id,question_order,title) values (tid,1,'反復する問題行動の疑似の目的は次のどれが正しいでしょう。') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'自分が行ったことを思い出し、反省し、第二信号系販社網を強める。',false),(qid,1,'反復する問題行動を行っても快感を得られないことを理解する。',false),(qid,2,'反復する問題を作り上げる後天的反射連鎖を弱める。',true);

insert into test_questions (test_id,question_order,title) values (tid,2,'擬似作業で生じる欲求や快感と治癒の関係は次のどれが正しいでしょう。') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'疑似で欲求や快感が生じたら、反復する問題行動は治らない。',false),(qid,1,'疑似で欲求や快感が生じても、反復する問題行動は治る。',true),(qid,2,'疑似で欲求が生じても反復する問題行動は治るが、快感が出れば治らない。',false);

insert into test_questions (test_id,question_order,title) values (tid,3,'反復する問題行動を止めようとする決意と擬似で生じる欲求や快感の関係はどれが正しいでしょうか？') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'やめようとする決意があれば、擬似で欲求や快感は出ない。',false),(qid,1,'やめようとする決意があれば、擬似で欲求や快感は出る。',false),(qid,2,'やめようとする決意と、擬似での欲求や快感の有無は関係ない。',true);

insert into test_questions (test_id,question_order,title) values (tid,4,'擬似をして快感やうれしさを感じた人はどうするべきでしょうか？') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'擬似を数日やめて、おまじない（制御刺激）だけを反復する。',false),(qid,1,'擬似を続けて、快感やうれしさは生じるままでいい。',true),(qid,2,'擬似を続けて、快感やうれしさを思考で制御して出ないようにする。',false);

insert into test_questions (test_id,question_order,title) values (tid,5,'擬似作業では、快感をどのようにしようとするのが正しいでしょうか。') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'できる限り快感を感じないようにする。',false),(qid,1,'快感のことを考えてはいけない。',false),(qid,2,'決められた方法の範囲で、快感をむさぼろうとする。',true);

insert into test_questions (test_id,question_order,title) values (tid,6,'単独での擬似が始まれば、一日に何回程度するべきでしょう。') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'２回程度でいい。',false),(qid,1,'５回程度でいい。',false),(qid,2,'２０回以上。',true);

insert into test_questions (test_id,question_order,title) values (tid,7,'反復する問題行動をしたいという欲求の有無と擬似の実施の時間的関係はどれが正しいでしょうか。') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'欲求があるときに、擬似をする。',false),(qid,1,'欲求がないときに、擬似をする。',false),(qid,2,'欲求があってもなくても、擬似をする',true);

insert into test_questions (test_id,question_order,title) values (tid,8,'擬似と次の擬似の時間間隔についての注意事項はなんでしょう。') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'時間間隔は取らなくてよい。',false),(qid,1,'時間間隔はだいたい20分にする。',false),(qid,2,'時間間隔は20分以上にする。',true);

insert into test_questions (test_id,question_order,title) values (tid,9,'擬似の後の制御刺激（おまじない）について正しいのはどれでしょう。') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'擬似の中断直後に、あるいは完了直後に、必ず、制御刺激をする。',true),(qid,1,'擬似の中断直後に、あるいは完了直後に、制御刺激をしてはならない。',false),(qid,2,'擬似の中断直後に、あるいは完了直後に、制御刺激をしてもよい。',false);

insert into test_questions (test_id,question_order,title) values (tid,10,'制御刺激（おまじない）をした後の擬似について正しいのはどれでしょう。') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'制御刺激（おまじない）をした後、直ちに疑似をしてもよい。',false),(qid,1,'制御刺激（おまじない）をしたら、ぴったり20分後に疑似をする',false),(qid,2,'制御刺激（おまじない）をした後、疑似をするまで20分以上あける。',true),(qid,3,'制御刺激（おまじない）をしたら、その日は疑似をしない。',false);

insert into test_questions (test_id,question_order,title) values (tid,11,'疑似ステージでのおまじない（制御刺激）は一日に何回するべきでしょう。') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'２回程度でよい。',false),(qid,1,'５回程度でよい。',false),(qid,2,'２０回以上。',true);

insert into test_questions (test_id,question_order,title) values (tid,12,'疑似ステージでのおまじない（制御刺激）はいつするべきでしょう。') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'擬似の直後のみ、おまじないをする。',false),(qid,1,'擬似のしないときのみ、おまじないをする。',false),(qid,2,'擬似をした後、しないときに関わらず制御刺激（おまじない）をする。',true);

insert into test_questions (test_id,question_order,title) values (tid,13,'疑似をする場所や人数はどうするのが良いでしょう。') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'自室及び指定された場所のみで単独で行う',true),(qid,1,'信頼できる仲間と一緒にする',false),(qid,2,'一緒にしてはいけないが、ほかの人に疑似を見せてあげるのはよい。',false);

end $$;

-- ===== test4: 想像の理解度テスト =====
do $$ declare
  qid int;
  tid int := 4;
begin

insert into test_questions (test_id,question_order,title) values (tid,1,'反復する問題行動の想像では何を思い出すでしょう。') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'なぜ反復する問題行動をしたかの理由',false),(qid,1,'反復する問題行動で一番楽しいところ、気持ちいいところ',false),(qid,2,'日常生活から始め、反復する問題行動に移る',true);

insert into test_questions (test_id,question_order,title) values (tid,2,'反復する問題行動の想像の目的は次のどれが正しいでしょう。') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'反復する問題行動を解決するための人間的で高等な思考を整える。',false),(qid,1,'反復する問題行動を多彩なパターンで多くの刺激を網羅する。',false),(qid,2,'反復する問題行動を途中から逸れる想像を反復し、そのパターンを作る。',true);

insert into test_questions (test_id,question_order,title) values (tid,3,'想像で生じる映像や音声と治癒の関係はどれが正しいでしょう。') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'それらが生じたら、反復する問題行動は治らない。',false),(qid,1,'それらが生じても、反復する問題行動が治るか治らないかには関係無い。',true),(qid,2,'それらが生じたら、反復する問題行動は治る。',false);

insert into test_questions (test_id,question_order,title) values (tid,4,'決意と想像で生じる映像や音声との関係はどれが正しいでしょう。') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'反復する問題行動をやめようとする決意があれば、映像や音声が生じる。',false),(qid,1,'反復する問題行動をやめようとする決意と映像や音声の発言は関係ない。',true),(qid,2,'反復する問題行動をやめようとする決意があれば、映像や音声は生じない。',false);

insert into test_questions (test_id,question_order,title) values (tid,5,'想像をして快感や欲求が生じたら、どうするべきでしょうか。') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'想像を数日間やめて、擬似だけを反復する。',false),(qid,1,'想像の回数を減らして、擬似の回数を増やす。',false),(qid,2,'想像を続けて、快感や欲求を感じることを反復していく。',true);

insert into test_questions (test_id,question_order,title) values (tid,6,'想像作業では、快感をどのようにしようとするのが正しいでしょう。') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'できる限り快感を感じないようにする。',false),(qid,1,'快感のことを考えてはいけない。',false),(qid,2,'決められた方法の範囲で、快感をむさぼろうとする。',true);

insert into test_questions (test_id,question_order,title) values (tid,7,'想像で、映像や音声、快感や欲求がなくなればどうすればよいでしょうか。') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'反復する問題行動を促進する反射が消え、治癒したので、治癒を止める。',false),(qid,1,'想像では刺激を得られないので、制御刺激と擬似だけをする。',false),(qid,2,'反応が全くなくなれば、あらすじだけでも思い出す、あるいは作り上げる。',true);

insert into test_questions (test_id,question_order,title) values (tid,8,'単独での想像が始まれば、想像は１日に何回程度するべきでしょう。') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'5回以上',false),(qid,1,'10回以上',false),(qid,2,'20回以上',true);

insert into test_questions (test_id,question_order,title) values (tid,9,'想像をするのは、反復する問題行動をしたいという欲求があるときでしょうか。') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'欲求があるときに、想像をする。',false),(qid,1,'欲求がないときに、想像をする。',false),(qid,2,'欲求があってもなくても、想像をする。',true);

insert into test_questions (test_id,question_order,title) values (tid,10,'想像と次の想像の時間間隔についての注意事項はなんでしょう。') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'時間間隔は取らなくて良い。',false),(qid,1,'時間間隔はだいたい20分にする。',false),(qid,2,'時間間隔は20分以上にする。',true);

insert into test_questions (test_id,question_order,title) values (tid,11,'想像をした後の制御刺激について正しいのはどれでしょう。') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'想像の中断直後に、あるいは完了直後に、必ず、制御刺激をする。',true),(qid,1,'想像の中断直後に、あるいは完了直後に、制御刺激をしてはならない。',false),(qid,2,'想像の中断直後に、あるいは完了直後に、制御刺激をしてもよい。',false);

insert into test_questions (test_id,question_order,title) values (tid,12,'制御刺激をした後の想像について正しいのはどれでしょう。') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'制御刺激をした後、直ちに想像をしても良い。',false),(qid,1,'制御刺激をしたら、ぴったり20分後にする。',false),(qid,2,'制御刺激をした後、想像をするまで必ず20分以上あける。',true),(qid,3,'制御刺激をしたら、その日は想像をしない。',false);

insert into test_questions (test_id,question_order,title) values (tid,13,'想像ステージでの制御刺激は一日何回すべきでしょう。') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'２回程度で良い。',false),(qid,1,'５回程度で良い。',false),(qid,2,'２０回以上。',true);

insert into test_questions (test_id,question_order,title) values (tid,14,'想像ステージで制御刺激はいつしてよいでしょうか。') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'想像の直後のみ、制御刺激をしてよい。',false),(qid,1,'想像をしない時のみ、制御刺激をしてよい。',false),(qid,2,'想像の直後も想像をしない時も、制御刺激をしてもよい。',true);

insert into test_questions (test_id,question_order,title) values (tid,15,'想像と擬似の時間的関係について正しいのはどれでしょう。') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'想像の直後に擬似をしてはならない。',false),(qid,1,'想像の直後に擬似をしてもよいし、擬似の直後にしなくてもよい。',true),(qid,2,'擬似の直後に想像をしてはならない。',false);

insert into test_questions (test_id,question_order,title) values (tid,16,'想像ステージで擬似は一日何回するべきでしょう。') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'2回程度でよい。',false),(qid,1,'5回程度でよい。',true),(qid,2,'20回以上。',false);

insert into test_questions (test_id,question_order,title) values (tid,17,'想像をする場所や人数はどうでしょう。') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'自室及び指定された場所のみで単独で行う。',true),(qid,1,'どこでやってもよいが、単独でする。',false),(qid,2,'どこでやってもよいが、単独では行わないほうがよい。',false);

end $$;

-- ===== test5: 維持の理解度テスト =====
do $$ declare
  qid int;
  tid int := 5;
begin

insert into test_questions (test_id,question_order,title) values (tid,1,'維持ステージに入る人の脳は次のどの状態でしょう') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'反復した問題行動に対する反省がやっと出てきた。',false),(qid,1,'反復した問題行動を作る反射連鎖の行動性は強い。',false),(qid,2,'反復した問題行動を作る反射連鎖の行動性は弱い。',true),(qid,3,'反復した問題行動を作る反射連鎖の行動性は完全になくなった。',false);

insert into test_questions (test_id,question_order,title) values (tid,2,'維持ステージの作業の目的に含まれるのは次のどれでしょう。') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'反復した問題行動をしないように、反省を続ける。',false),(qid,1,'反復した問題行動を作る反射連鎖を弱い状態に保つ。',true),(qid,2,'反復した問題行動を作る反射連鎖を再び作る。',false),(qid,3,'反復した問題行動を作る反射連鎖を強い状態に保つ。',false);

insert into test_questions (test_id,question_order,title) values (tid,3,'維持ステージの作業をしないと何が起こりますか？') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'反復した問題行動を忘れて人生がうまくいく。',false),(qid,1,'反復した問題行動を作る反射連鎖が強くなる。',true),(qid,2,'反復した問題行動を作る反射連鎖が弱くなる。',false);

insert into test_questions (test_id,question_order,title) values (tid,4,'この先の維持作業について次のどれが正しいでしょう。') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'維持作業は、再度、反復した問題行動が生じた人だけが行う。',false),(qid,1,'維持作業は、条件反射制御法を受けた人は全員が毎日行う。',false),(qid,2,'維持作業は、条件反射制御法を受けた人は全員が週に一日は行う。',true);

insert into test_questions (test_id,question_order,title) values (tid,5,'条件反射制御法を怠っていたために、突然、強烈で、抵抗しがたい欲求に襲われた場合に、まずやるべきことは次のどれでしょうか。') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'最後の１回だけ本当の反復した問題行動をする。',false),(qid,1,'おまじないで欲求を消す。',false),(qid,2,'擬似あるいは想像を十分に反復する。',true);

insert into test_questions (test_id,question_order,title) values (tid,6,'擬似はどのくらいの頻度で行うべきでしょうか？') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'毎日2回以上',false),(qid,1,'毎日5回以上',false),(qid,2,'毎日20回以上',false),(qid,3,'毎週2回以上',true),(qid,4,'毎週5回以上',false),(qid,5,'毎週20回以上',false);

insert into test_questions (test_id,question_order,title) values (tid,7,'想像はどのくらいの頻度で行うべきでしょうか？') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'毎日2回以上',false),(qid,1,'毎日5回以上',false),(qid,2,'毎日20回以上',false),(qid,3,'毎週2回以上',false),(qid,4,'毎週5回以上',true),(qid,5,'毎週20回以上',false);

insert into test_questions (test_id,question_order,title) values (tid,8,'維持ステージでおまじない（制御刺激）は一日に何回するべきでしょうか。') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'毎日2回以上',false),(qid,1,'毎日5回以上',true),(qid,2,'毎日20回以上',false),(qid,3,'毎週2回以上',false),(qid,4,'毎週5回以上',false),(qid,5,'毎週20回以上',false);

insert into test_questions (test_id,question_order,title) values (tid,9,'現在、おまじない（制御刺激）はどのように働くでしょう。') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'反復した問題行動をしたことに対する反省を完全に引き出せる。',false),(qid,1,'反復した問題行動を止める反射を強く動かす。',false),(qid,2,'反復した問題行動を止める反射を完全に弱める。',false),(qid,3,'反復した問題行動を止める反射を動かす。',true);

insert into test_questions (test_id,question_order,title) values (tid,10,'おまじない（制御刺激）に関して、維持ステージの作業はどのように働くでしょう。') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'反復した問題行動をしないための半生を忘れさせないので、おまじないの効果を保たせる。',false),(qid,1,'反復した問題行動を止める反射を動かないようにする。',false),(qid,2,'反復した問題行動を止める反射を動かす効果を再び作る。',false),(qid,3,'反復した問題行動を止める反射を動かす効果を保つ。',true);

insert into test_questions (test_id,question_order,title) values (tid,11,'維持ステージの作業をしなければおまじない（制御刺激）に何が起こりますか？') returning id into qid;
insert into test_choices (question_id,choice_order,text,is_correct) values (qid,0,'反復した問題行動を止める効果が保たれる。',false),(qid,1,'反復した問題行動を止める効果が強くなる。',false),(qid,2,'反復した問題行動を止める効果が弱くなる。',true);

end $$;
