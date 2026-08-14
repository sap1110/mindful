import type { HealthIntent } from '../intent'
import type { RiskLevel } from '../risk'

/**
 * The labelled training data.
 *
 * **Provenance, stated plainly because it is the most important limitation of
 * the trained models:** these examples are hand-authored for this project.
 * They are not real user questions, they were not collected from anyone, and
 * no person's health data was used to train anything — which is the only way
 * to build a supervised classifier for an app that promises nothing leaves the
 * device. The cost is real: a model trained on invented phrasings learns the
 * author's idea of how people write, and will be weakest on phrasings the
 * author did not think of. The register mix below is the mitigation, the
 * held-out test split is the measurement, and neither makes the limitation go
 * away. It is recorded in the model artefact and shown in the README.
 *
 * Three registers are represented deliberately throughout, in roughly equal
 * measure, for the same reason Echo's retrieval evaluation slices by register:
 *
 *   tidy       "I have had a headache for two days"
 *   phone      "cant sleep, head killing me, been days"
 *   second-language  "I am having pain in the head since two days"
 *
 * A classifier that scores well on the first and badly on the rest is not a
 * good classifier with a rough edge — it is one that works best for people who
 * write like whoever built it.
 *
 * Nothing here may duplicate a case in `evaluation.ts`. Training on the
 * evaluation set would turn every CI gate into a measurement of memorisation,
 * and a test asserts the two sets stay disjoint — it has already caught four
 * examples that had drifted into both, which is why the assertion exists
 * rather than the intention.
 */

export interface LabelledExample {
  text: string
  intent: HealthIntent
  risk: RiskLevel
}

/**
 * Intent and risk are labelled on the same examples rather than in two
 * separate corpora: they are two questions about one sentence, and labelling
 * them together keeps the pair coherent — "chest pain for a week" is a symptom
 * question *and* a high-risk one, and no example is allowed to disagree with
 * itself.
 */
export const TRAINING_DATA: readonly LabelledExample[] = [
  /* ---------------------------------------------------------- symptom ---- */
  { text: 'I have had a headache for two days now', intent: 'symptom', risk: 'moderate' },
  { text: 'my head hurts every afternoon', intent: 'symptom', risk: 'low' },
  { text: 'head killing me since this morning', intent: 'symptom', risk: 'low' },
  { text: 'I am having pain in the head since two days', intent: 'symptom', risk: 'moderate' },
  { text: 'my throat is really sore and I keep coughing', intent: 'symptom', risk: 'low' },
  { text: 'sore throat and cough, feels rough', intent: 'symptom', risk: 'low' },
  { text: 'I am having the cough since one week', intent: 'symptom', risk: 'moderate' },
  { text: 'my stomach has been hurting since last night', intent: 'symptom', risk: 'low' },
  { text: 'tummy ache wont go away', intent: 'symptom', risk: 'low' },
  { text: 'I feel sick and dizzy after eating', intent: 'symptom', risk: 'low' },
  { text: 'been feeling lightheaded when I get up too fast', intent: 'symptom', risk: 'low' },
  { text: 'I feel dizziness when I am standing quickly', intent: 'symptom', risk: 'low' },
  { text: 'my lower back is aching after work', intent: 'symptom', risk: 'low' },
  { text: 'back pain for the last three weeks', intent: 'symptom', risk: 'moderate' },
  { text: 'I have pain in my back since long time', intent: 'symptom', risk: 'moderate' },
  { text: 'my knee hurts when I go up stairs', intent: 'symptom', risk: 'low' },
  { text: 'shoulder has been stiff for days', intent: 'symptom', risk: 'moderate' },
  { text: 'I have a temperature and I ache all over', intent: 'symptom', risk: 'low' },
  { text: 'running a fever since yesterday evening', intent: 'symptom', risk: 'low' },
  { text: 'I am having fever from two days, what to do', intent: 'symptom', risk: 'moderate' },
  { text: 'I am exhausted no matter how much I sleep', intent: 'symptom', risk: 'low' },
  { text: 'tired all the time lately, no energy', intent: 'symptom', risk: 'low' },
  { text: 'I am feeling weakness in whole body', intent: 'symptom', risk: 'low' },
  { text: 'I have not been sleeping and I feel wrecked in the day', intent: 'symptom', risk: 'low' },
  { text: 'my eyes hurt after looking at a screen all day', intent: 'symptom', risk: 'low' },
  { text: 'blocked nose and headache for a few days', intent: 'symptom', risk: 'low' },
  { text: 'keep getting heartburn in the evenings', intent: 'symptom', risk: 'low' },
  { text: 'my skin is itchy and a bit red', intent: 'symptom', risk: 'low' },
  { text: 'I keep getting cramps in my legs at night', intent: 'symptom', risk: 'low' },
  { text: 'feeling nauseous most mornings this week', intent: 'symptom', risk: 'moderate' },
  { text: 'my ears feel blocked and sounds are muffled', intent: 'symptom', risk: 'low' },
  { text: 'jaw is sore and clicking when I chew', intent: 'symptom', risk: 'low' },
  { text: 'I have been getting pins and needles in my hand', intent: 'symptom', risk: 'moderate' },
  { text: 'my ankle is swollen after twisting it', intent: 'symptom', risk: 'low' },
  { text: 'sinuses hurt and my face feels full', intent: 'symptom', risk: 'low' },
  { text: 'stomach is upset and I keep running to the loo', intent: 'symptom', risk: 'low' },
  { text: 'I get breathless walking up the hill lately', intent: 'symptom', risk: 'moderate' },
  { text: 'my hands are cold and tingly a lot', intent: 'symptom', risk: 'low' },
  { text: 'been getting headaches most days for a month', intent: 'symptom', risk: 'moderate' },
  { text: 'I have body pain and feeling not well', intent: 'symptom', risk: 'low' },
  { text: 'my wrist aches from typing all day', intent: 'symptom', risk: 'low' },
  { text: 'I feel a bit off and shivery today', intent: 'symptom', risk: 'low' },
  { text: 'sharp pain in my side when I breathe in deep', intent: 'symptom', risk: 'moderate' },
  { text: 'my child has a rash and a bit of a temperature', intent: 'symptom', risk: 'moderate' },
  { text: 'toddler keeps pulling at his ear and crying', intent: 'symptom', risk: 'moderate' },
  { text: 'I am pregnant and getting a lot of back ache', intent: 'symptom', risk: 'moderate' },
  { text: 'my mouth is dry and I am thirsty constantly', intent: 'symptom', risk: 'low' },
  { text: 'feet are sore every morning when I stand up', intent: 'symptom', risk: 'low' },

  /* --------------------------------------------------- general-health ---- */
  { text: 'how much water should an adult drink each day', intent: 'general-health', risk: 'low' },
  { text: 'how much water per day is normal', intent: 'general-health', risk: 'low' },
  { text: 'how many glass of water I should take daily', intent: 'general-health', risk: 'low' },
  { text: 'what temperature counts as a fever', intent: 'general-health', risk: 'low' },
  { text: 'is 37.8 a fever or not', intent: 'general-health', risk: 'low' },
  { text: 'what is the normal body temperature', intent: 'general-health', risk: 'low' },
  { text: 'how long does a cold normally last', intent: 'general-health', risk: 'low' },
  { text: 'how long till a cold goes away', intent: 'general-health', risk: 'low' },
  { text: 'how many hours of sleep do adults need', intent: 'general-health', risk: 'low' },
  { text: 'how much sleep is enough', intent: 'general-health', risk: 'low' },
  { text: 'how many hours sleeping is good for health', intent: 'general-health', risk: 'low' },
  { text: 'is coffee bad for you', intent: 'general-health', risk: 'low' },
  { text: 'is it bad to drink coffee every day', intent: 'general-health', risk: 'low' },
  { text: 'what does dehydration actually do to you', intent: 'general-health', risk: 'low' },
  { text: 'what are the signs of being dehydrated', intent: 'general-health', risk: 'low' },
  { text: 'how do I know if I am drinking enough', intent: 'general-health', risk: 'low' },
  { text: 'what is a healthy resting heart rate', intent: 'general-health', risk: 'low' },
  { text: 'how much salt is too much', intent: 'general-health', risk: 'low' },
  { text: 'does screen time before bed matter', intent: 'general-health', risk: 'low' },
  { text: 'is it true you should not eat late at night', intent: 'general-health', risk: 'low' },
  { text: 'what does a balanced diet mean really', intent: 'general-health', risk: 'low' },
  { text: 'how long is a cough normal for', intent: 'general-health', risk: 'low' },
  { text: 'what is the difference between a cold and flu', intent: 'general-health', risk: 'low' },
  { text: 'how many steps a day is good', intent: 'general-health', risk: 'low' },
  { text: 'is napping in the day bad for sleep', intent: 'general-health', risk: 'low' },
  { text: 'what counts as moderate exercise', intent: 'general-health', risk: 'low' },
  { text: 'how much caffeine is safe in a day', intent: 'general-health', risk: 'low' },
  { text: 'does alcohol affect sleep quality', intent: 'general-health', risk: 'low' },
  { text: 'what is normal blood pressure supposed to be', intent: 'general-health', risk: 'low' },
  { text: 'how often should someone see a dentist', intent: 'general-health', risk: 'low' },
  { text: 'is it normal to wake up in the night sometimes', intent: 'general-health', risk: 'low' },
  { text: 'what does BMI actually measure', intent: 'general-health', risk: 'low' },
  { text: 'how long should a workout be', intent: 'general-health', risk: 'low' },
  { text: 'is stretching before exercise necessary', intent: 'general-health', risk: 'low' },
  { text: 'what is the recommended amount of fibre', intent: 'general-health', risk: 'low' },
  { text: 'how much vitamin d do people need', intent: 'general-health', risk: 'low' },

  /* -------------------------------------------------------- recovery ---- */
  { text: 'how do I recover properly after a concussion', intent: 'recovery', risk: 'moderate' },
  { text: 'when can I play football again after a head knock', intent: 'recovery', risk: 'moderate' },
  { text: 'how soon back to training after concussion', intent: 'recovery', risk: 'moderate' },
  { text: 'when I can go back to sports after head injury', intent: 'recovery', risk: 'moderate' },
  { text: 'going back to school after a concussion', intent: 'recovery', risk: 'moderate' },
  { text: 'how long until I can return to work after being ill', intent: 'recovery', risk: 'low' },
  { text: 'when should I start exercising again after flu', intent: 'recovery', risk: 'low' },
  { text: 'how do I get back to running after time off sick', intent: 'recovery', risk: 'low' },
  { text: 'recovering from a chest infection how long', intent: 'recovery', risk: 'moderate' },
  { text: 'what helps recovery after a bad cold', intent: 'recovery', risk: 'low' },
  { text: 'should I rest completely while recovering', intent: 'recovery', risk: 'low' },
  { text: 'how much rest after concussion is right', intent: 'recovery', risk: 'moderate' },
  { text: 'getting back to normal after being off sick for weeks', intent: 'recovery', risk: 'moderate' },
  { text: 'how do I build strength back up after illness', intent: 'recovery', risk: 'low' },
  { text: 'is it ok to exercise while recovering from concussion', intent: 'recovery', risk: 'moderate' },
  { text: 'when is it safe to drive after a head injury', intent: 'recovery', risk: 'moderate' },
  { text: 'returning to screens after concussion advice', intent: 'recovery', risk: 'moderate' },
  { text: 'how many days rest before going back to the gym', intent: 'recovery', risk: 'low' },
  { text: 'my recovery is slower than expected what now', intent: 'recovery', risk: 'moderate' },
  { text: 'still not right weeks after the concussion', intent: 'recovery', risk: 'moderate' },
  { text: 'how do I pace myself while getting better', intent: 'recovery', risk: 'low' },
  { text: 'can I go back to school part time after concussion', intent: 'recovery', risk: 'moderate' },
  { text: 'what should recovery look like week by week', intent: 'recovery', risk: 'low' },
  { text: 'when can I lift weights again after being unwell', intent: 'recovery', risk: 'low' },

  /* --------------------------------------------------- mental-health ---- */
  { text: 'I have been feeling really anxious all week', intent: 'mental-health', risk: 'low' },
  { text: 'anxious all the time lately and I dont know why', intent: 'mental-health', risk: 'low' },
  { text: 'I am having much anxiety these days', intent: 'mental-health', risk: 'low' },
  { text: 'I think I might be depressed', intent: 'mental-health', risk: 'moderate' },
  { text: 'feeling really low for weeks now', intent: 'mental-health', risk: 'moderate' },
  { text: 'I am feeling sad since many days', intent: 'mental-health', risk: 'moderate' },
  { text: 'how do I deal with stress at work', intent: 'mental-health', risk: 'low' },
  { text: 'work stress is getting on top of me', intent: 'mental-health', risk: 'low' },
  { text: 'my mind will not stop racing at night', intent: 'mental-health', risk: 'low' },
  { text: 'brain wont shut up when I try to sleep', intent: 'mental-health', risk: 'low' },
  { text: 'I feel overwhelmed by everything right now', intent: 'mental-health', risk: 'moderate' },
  { text: 'everything feels like too much at the moment', intent: 'mental-health', risk: 'moderate' },
  { text: 'how can I calm down when I panic', intent: 'mental-health', risk: 'low' },
  { text: 'what helps during a panic attack', intent: 'mental-health', risk: 'moderate' },
  { text: 'I get panicky in crowds, what can I do', intent: 'mental-health', risk: 'low' },
  { text: 'I have been irritable and snappy with everyone', intent: 'mental-health', risk: 'low' },
  { text: 'I cannot concentrate on anything lately', intent: 'mental-health', risk: 'low' },
  { text: 'feeling numb and flat for a while now', intent: 'mental-health', risk: 'moderate' },
  { text: 'I have lost interest in things I used to enjoy', intent: 'mental-health', risk: 'moderate' },
  { text: 'I am lonely and it is getting to me', intent: 'mental-health', risk: 'moderate' },
  { text: 'how do I stop worrying about everything', intent: 'mental-health', risk: 'low' },
  { text: 'is what I am feeling normal or should I worry', intent: 'mental-health', risk: 'moderate' },
  { text: 'grief is hitting me harder than expected', intent: 'mental-health', risk: 'moderate' },
  { text: 'I feel guilty all the time about nothing', intent: 'mental-health', risk: 'moderate' },
  { text: 'how do I look after my mental health day to day', intent: 'mental-health', risk: 'low' },
  { text: 'burnt out and cannot face work', intent: 'mental-health', risk: 'moderate' },
  { text: 'my mood has been all over the place', intent: 'mental-health', risk: 'moderate' },
  { text: 'I keep crying for no reason', intent: 'mental-health', risk: 'moderate' },

  /* ------------------------------------------------------ preventive ---- */
  { text: 'how much exercise should I be doing weekly', intent: 'preventive', risk: 'low' },
  { text: 'how do I improve my sleep routine', intent: 'preventive', risk: 'low' },
  { text: 'what can I do to sleep better generally', intent: 'preventive', risk: 'low' },
  { text: 'how to make better sleeping habit', intent: 'preventive', risk: 'low' },
  { text: 'what can I do to stay healthy this winter', intent: 'preventive', risk: 'low' },
  { text: 'tips for building habits that actually stick', intent: 'preventive', risk: 'low' },
  { text: 'how do I stop getting headaches in the first place', intent: 'preventive', risk: 'low' },
  { text: 'ways to avoid back pain at a desk job', intent: 'preventive', risk: 'low' },
  { text: 'how do I look after my posture', intent: 'preventive', risk: 'low' },
  { text: 'best way to start exercising from nothing', intent: 'preventive', risk: 'low' },
  { text: 'how do I stay hydrated through the day', intent: 'preventive', risk: 'low' },
  { text: 'what should I do to protect my eyes from screens', intent: 'preventive', risk: 'low' },
  { text: 'how can I reduce stress before it builds up', intent: 'preventive', risk: 'low' },
  { text: 'what helps prevent getting sick so often', intent: 'preventive', risk: 'low' },
  { text: 'how do I build a routine that keeps me well', intent: 'preventive', risk: 'low' },
  { text: 'small changes to be healthier overall', intent: 'preventive', risk: 'low' },
  { text: 'how to look after myself during exam season', intent: 'preventive', risk: 'low' },
  { text: 'ways to wind down in the evening', intent: 'preventive', risk: 'low' },
  { text: 'how do I take breaks properly when working', intent: 'preventive', risk: 'low' },
  { text: 'what is a good morning routine for energy', intent: 'preventive', risk: 'low' },
  { text: 'how can I be more active without the gym', intent: 'preventive', risk: 'low' },
  { text: 'preventing injury when I start running again', intent: 'preventive', risk: 'low' },

  /* -------------------------------------------- diagnosis-explanation ---- */
  { text: 'what does a concussion actually mean', intent: 'diagnosis-explanation', risk: 'low' },
  { text: 'what is happening in the brain in a concussion', intent: 'diagnosis-explanation', risk: 'low' },
  { text: 'my doctor said migraine, what does that mean', intent: 'diagnosis-explanation', risk: 'low' },
  { text: 'they told me I have insomnia, what is that exactly', intent: 'diagnosis-explanation', risk: 'low' },
  { text: 'I was diagnosed with anxiety, what does it involve', intent: 'diagnosis-explanation', risk: 'low' },
  { text: 'can you explain what my diagnosis means in plain words', intent: 'diagnosis-explanation', risk: 'low' },
  { text: 'what is the difference between migraine and headache', intent: 'diagnosis-explanation', risk: 'low' },
  { text: 'the doctor mentioned persisting symptoms, what is that', intent: 'diagnosis-explanation', risk: 'low' },
  { text: 'what does it mean when they say relative rest', intent: 'diagnosis-explanation', risk: 'low' },
  { text: 'explain what post concussion symptoms are', intent: 'diagnosis-explanation', risk: 'low' },
  { text: 'what is meaning of this diagnosis in simple words', intent: 'diagnosis-explanation', risk: 'low' },
  { text: 'what does a sub symptom threshold mean', intent: 'diagnosis-explanation', risk: 'low' },
  { text: 'why does concussion make thinking so tiring', intent: 'diagnosis-explanation', risk: 'low' },
  { text: 'what is the energy crisis they talk about after head injury', intent: 'diagnosis-explanation', risk: 'low' },
  { text: 'what does depression actually do to the body', intent: 'diagnosis-explanation', risk: 'low' },
  { text: 'explain what a panic attack is physically', intent: 'diagnosis-explanation', risk: 'low' },
  { text: 'what is the difference between stress and anxiety', intent: 'diagnosis-explanation', risk: 'low' },
  { text: 'why do they call it graduated return to sport', intent: 'diagnosis-explanation', risk: 'low' },

  /* ------------------------------------------------------ medication ---- */
  { text: 'how many mg of ibuprofen is safe at once', intent: 'medication', risk: 'moderate' },
  { text: 'can I take paracetamol and ibuprofen together', intent: 'medication', risk: 'moderate' },
  { text: 'is it ok to mix these two medicines', intent: 'medication', risk: 'moderate' },
  { text: 'should I stop taking my antidepressants', intent: 'medication', risk: 'moderate' },
  { text: 'can I double my dose if it is not working', intent: 'medication', risk: 'moderate' },
  { text: 'what dosage of melatonin should I use', intent: 'medication', risk: 'moderate' },
  { text: 'how much aspirin can I take in a day', intent: 'medication', risk: 'moderate' },
  { text: 'is it safe to drink alcohol on this medication', intent: 'medication', risk: 'moderate' },
  { text: 'can I come off my medication early', intent: 'medication', risk: 'moderate' },
  { text: 'what tablets should I take for this pain', intent: 'medication', risk: 'moderate' },
  { text: 'how many pills is too many in one go', intent: 'medication', risk: 'moderate' },
  { text: 'I want to start taking sertraline, how much', intent: 'medication', risk: 'moderate' },

  /* ----------------------------------------------------- out-of-scope ---- */
  { text: 'diagnose me please, what do I have', intent: 'out-of-scope', risk: 'moderate' },
  { text: 'just tell me what the problem is with my body', intent: 'out-of-scope', risk: 'moderate' },
  { text: 'do I have cancer', intent: 'out-of-scope', risk: 'moderate' },
  { text: 'do I have diabetes based on this', intent: 'out-of-scope', risk: 'moderate' },
  { text: 'can you prescribe me something', intent: 'out-of-scope', risk: 'moderate' },
  { text: 'write me a prescription for antibiotics', intent: 'out-of-scope', risk: 'moderate' },
  { text: 'which antibiotic should I take for this', intent: 'out-of-scope', risk: 'moderate' },
  { text: 'what condition do I have exactly', intent: 'out-of-scope', risk: 'moderate' },
  { text: 'can I treat this without telling my doctor', intent: 'out-of-scope', risk: 'moderate' },
  { text: 'is there a way to handle this instead of seeing a gp', intent: 'out-of-scope', risk: 'moderate' },
  { text: 'do I have adhd, tell me straight', intent: 'out-of-scope', risk: 'moderate' },

  /* --------------------------------------------------------- unclear ---- */
  { text: 'is this a problem', intent: 'unclear', risk: 'unknown' },
  { text: 'sore', intent: 'unclear', risk: 'unknown' },
  { text: 'is this concerning', intent: 'unclear', risk: 'unknown' },
  { text: 'help', intent: 'unclear', risk: 'unknown' },
  { text: 'what do you think', intent: 'unclear', risk: 'unknown' },
  { text: 'not sure what is going on', intent: 'unclear', risk: 'unknown' },
  { text: 'my friend has a thing', intent: 'unclear', risk: 'unknown' },
  { text: 'is it serious', intent: 'unclear', risk: 'unknown' },
  { text: 'quick question', intent: 'unclear', risk: 'unknown' },
  { text: 'something feels off', intent: 'unclear', risk: 'unknown' },
  { text: 'been feeling weird', intent: 'unclear', risk: 'unknown' },
  { text: 'can you help me', intent: 'unclear', risk: 'unknown' },
  { text: 'what about this', intent: 'unclear', risk: 'unknown' },
  { text: 'hello', intent: 'unclear', risk: 'unknown' },

  /* ------------------------------------------- high risk, mixed intent ---- */
  { text: 'crushing pain in my chest going down my arm', intent: 'symptom', risk: 'high' },
  { text: 'chest feels tight and I cannot breathe properly', intent: 'symptom', risk: 'high' },
  { text: 'sudden chest pressure and sweating', intent: 'symptom', risk: 'high' },
  { text: 'my face has dropped on one side suddenly', intent: 'symptom', risk: 'high' },
  { text: 'his speech went slurred and his arm is weak', intent: 'symptom', risk: 'high' },
  { text: 'cannot lift my arm and my face feels numb', intent: 'symptom', risk: 'high' },
  { text: 'worst headache I have ever had, came on in seconds', intent: 'symptom', risk: 'high' },
  { text: 'sudden severe headache out of nowhere', intent: 'symptom', risk: 'high' },
  { text: 'stiff neck with a fever and a rash', intent: 'symptom', risk: 'high' },
  { text: 'rash that does not fade when I press a glass on it', intent: 'symptom', risk: 'high' },
  { text: 'my throat is closing up after eating nuts', intent: 'symptom', risk: 'high' },
  { text: 'lips and tongue swelling and hard to breathe', intent: 'symptom', risk: 'high' },
  { text: 'bleeding will not stop from a deep cut', intent: 'symptom', risk: 'high' },
  { text: 'I am coughing up blood', intent: 'symptom', risk: 'high' },
  { text: 'he just had a seizure and is confused', intent: 'symptom', risk: 'high' },
  { text: 'back pain and I have lost control of my bladder', intent: 'symptom', risk: 'high' },
  { text: 'numbness around my groin with back pain', intent: 'symptom', risk: 'high' },
  { text: 'my baby is three weeks old with a fever', intent: 'symptom', risk: 'high' },
  { text: 'newborn temperature is 38.5 what do I do', intent: 'symptom', risk: 'high' },
  { text: 'he hit his head and is vomiting and drowsy', intent: 'symptom', risk: 'high' },
  { text: 'after the head injury one pupil looks bigger', intent: 'symptom', risk: 'high' },
  { text: 'she passed out and hit her head hard', intent: 'symptom', risk: 'high' },
  { text: 'my child swallowed some bleach', intent: 'symptom', risk: 'high' },
  { text: 'took too many tablets by accident', intent: 'symptom', risk: 'high' },

  /* -------------------------------------- moderate risk, mixed intent ---- */
  { text: 'my cough has been getting worse for two weeks', intent: 'symptom', risk: 'moderate' },
  { text: 'the pain keeps getting worse each day', intent: 'symptom', risk: 'moderate' },
  { text: 'headaches for over a month now and painkillers do nothing', intent: 'symptom', risk: 'moderate' },
  { text: 'severe pain in my stomach that will not settle', intent: 'symptom', risk: 'moderate' },
  { text: 'my daughter has been off her food for days', intent: 'symptom', risk: 'moderate' },
  { text: 'I am diabetic and my foot has a sore that is not healing', intent: 'symptom', risk: 'moderate' },
  { text: 'pregnant and having bad headaches', intent: 'symptom', risk: 'moderate' },
  { text: 'unbearable toothache for three days', intent: 'symptom', risk: 'moderate' },
  { text: 'my son keeps being sick and cannot keep water down', intent: 'symptom', risk: 'moderate' },
  { text: 'dizzy spells keep happening every day this week', intent: 'symptom', risk: 'moderate' },
  { text: 'I have a heart condition and I am getting more breathless', intent: 'symptom', risk: 'moderate' },
  { text: 'my baby has a cough that keeps returning', intent: 'symptom', risk: 'moderate' },

  /* ------------------------------------- second pass: the weak classes ---- */
  /*
   * The first trained model scored 0.00 F1 on medication, out-of-scope,
   * unclear and high risk — it had learned that guessing "symptom, low" wins
   * when those classes are a handful of rows each. Class weighting fixed half
   * of it; the rest was simply not enough data, so these are the examples that
   * were missing, written to cover the phrasings the confusion matrix showed
   * collapsing into the majority classes.
   */

  /* medication */
  { text: 'what painkiller is best for a headache', intent: 'medication', risk: 'moderate' },
  { text: 'how often can I take painkillers in a day', intent: 'medication', risk: 'moderate' },
  { text: 'is it safe to take ibuprofen on an empty stomach', intent: 'medication', risk: 'moderate' },
  { text: 'can I give my child paracetamol for this fever', intent: 'medication', risk: 'moderate' },
  { text: 'how much medicine should I give a toddler', intent: 'medication', risk: 'moderate' },
  { text: 'I missed a dose of my tablets what now', intent: 'medication', risk: 'moderate' },
  { text: 'can I take my medication with food', intent: 'medication', risk: 'moderate' },
  { text: 'are these two tablets ok to take at the same time', intent: 'medication', risk: 'moderate' },
  { text: 'should I take antihistamines every day', intent: 'medication', risk: 'moderate' },
  { text: 'what supplement should I take for tiredness', intent: 'medication', risk: 'moderate' },
  { text: 'is melatonin safe to use for sleeping', intent: 'medication', risk: 'moderate' },
  { text: 'how long can I keep taking these tablets for', intent: 'medication', risk: 'moderate' },
  { text: 'can I take vitamin tablets with my prescription', intent: 'medication', risk: 'moderate' },
  { text: 'my medicine is not working can I take more', intent: 'medication', risk: 'moderate' },
  { text: 'what is the maximum paracetamol in 24 hours', intent: 'medication', risk: 'moderate' },
  { text: 'can I drink alcohol while on antibiotics', intent: 'medication', risk: 'moderate' },

  /* out-of-scope */
  { text: 'is this cancer or not just tell me', intent: 'out-of-scope', risk: 'moderate' },
  { text: 'give me a diagnosis for these symptoms', intent: 'out-of-scope', risk: 'moderate' },
  { text: 'what illness is this exactly', intent: 'out-of-scope', risk: 'moderate' },
  { text: 'do I have an infection, yes or no', intent: 'out-of-scope', risk: 'moderate' },
  { text: 'am I autistic', intent: 'out-of-scope', risk: 'moderate' },
  { text: 'do I have depression officially', intent: 'out-of-scope', risk: 'moderate' },
  { text: 'can you tell me if I am ill without a doctor', intent: 'out-of-scope', risk: 'moderate' },
  { text: 'what medicine should you prescribe for me', intent: 'out-of-scope', risk: 'moderate' },
  { text: 'I want a diagnosis not general advice', intent: 'out-of-scope', risk: 'moderate' },
  { text: 'do I have a broken bone', intent: 'out-of-scope', risk: 'moderate' },
  { text: 'is my condition serious, diagnose it', intent: 'out-of-scope', risk: 'moderate' },
  { text: 'skip the doctor and just tell me what it is', intent: 'out-of-scope', risk: 'moderate' },

  /* unclear */
  { text: 'hmm', intent: 'unclear', risk: 'unknown' },
  { text: 'ok', intent: 'unclear', risk: 'unknown' },
  { text: 'what now', intent: 'unclear', risk: 'unknown' },
  { text: 'any ideas', intent: 'unclear', risk: 'unknown' },
  { text: 'tell me more', intent: 'unclear', risk: 'unknown' },
  { text: 'is that normal', intent: 'unclear', risk: 'unknown' },
  { text: 'what does that mean', intent: 'unclear', risk: 'unknown' },
  { text: 'and now', intent: 'unclear', risk: 'unknown' },
  { text: 'thoughts', intent: 'unclear', risk: 'unknown' },
  { text: 'idk', intent: 'unclear', risk: 'unknown' },
  { text: 'not feeling great', intent: 'unclear', risk: 'unknown' },
  { text: 'bit rough today', intent: 'unclear', risk: 'unknown' },
  { text: 'my body', intent: 'unclear', risk: 'unknown' },
  { text: 'question about health', intent: 'unclear', risk: 'unknown' },
  { text: 'anyone there', intent: 'unclear', risk: 'unknown' },
  { text: 'need advice', intent: 'unclear', risk: 'unknown' },

  /* mental-health, which was collapsing into symptom */
  { text: 'my anxiety has been awful this month', intent: 'mental-health', risk: 'moderate' },
  { text: 'I worry constantly about everything', intent: 'mental-health', risk: 'low' },
  { text: 'feeling hopeless about the future', intent: 'mental-health', risk: 'moderate' },
  { text: 'I have no motivation for anything anymore', intent: 'mental-health', risk: 'moderate' },
  { text: 'my mental health is slipping', intent: 'mental-health', risk: 'moderate' },
  { text: 'I feel disconnected from everyone around me', intent: 'mental-health', risk: 'moderate' },
  { text: 'stressed out and cannot switch off', intent: 'mental-health', risk: 'low' },
  { text: 'I get nervous before every social thing', intent: 'mental-health', risk: 'low' },
  { text: 'my mood keeps dropping in the evenings', intent: 'mental-health', risk: 'moderate' },
  { text: 'I am struggling emotionally at the moment', intent: 'mental-health', risk: 'moderate' },
  { text: 'how do I cope with feeling low', intent: 'mental-health', risk: 'moderate' },
  { text: 'I feel anxious in the mornings especially', intent: 'mental-health', risk: 'low' },
  { text: 'my head is full of worry all day', intent: 'mental-health', risk: 'low' },
  { text: 'I am not coping well with things', intent: 'mental-health', risk: 'moderate' },
  { text: 'feeling very down and tearful', intent: 'mental-health', risk: 'moderate' },
  { text: 'I am having a lot of tension in mind', intent: 'mental-health', risk: 'low' },

  /* high risk, expanded */
  { text: 'sudden weakness down my left side', intent: 'symptom', risk: 'high' },
  { text: 'I cannot catch my breath at all', intent: 'symptom', risk: 'high' },
  { text: 'chest hurts badly and I feel clammy', intent: 'symptom', risk: 'high' },
  { text: 'my vision went and my head exploded in pain', intent: 'symptom', risk: 'high' },
  { text: 'confused and very drowsy after banging his head', intent: 'symptom', risk: 'high' },
  { text: 'she is having a fit right now', intent: 'symptom', risk: 'high' },
  { text: 'my four week old baby feels burning hot', intent: 'symptom', risk: 'high' },
  { text: 'swelling in my mouth and struggling to swallow', intent: 'symptom', risk: 'high' },
  { text: 'blood in my vomit this morning', intent: 'symptom', risk: 'high' },
  { text: 'cannot feel my legs properly and back is agony', intent: 'symptom', risk: 'high' },
  { text: 'he is unconscious and will not wake up', intent: 'symptom', risk: 'high' },
  { text: 'took a whole packet of tablets', intent: 'symptom', risk: 'high' },

  /* general-health and preventive, topped up for balance */
  { text: 'what is a normal amount of exercise for a week', intent: 'general-health', risk: 'low' },
  { text: 'how much sleep does a teenager need', intent: 'general-health', risk: 'low' },
  { text: 'what foods help with energy levels', intent: 'general-health', risk: 'low' },
  { text: 'is it normal to feel tired in winter', intent: 'general-health', risk: 'low' },
  { text: 'how long should I wait before exercising after eating', intent: 'general-health', risk: 'low' },
  { text: 'what is a healthy weekly routine', intent: 'preventive', risk: 'low' },
  { text: 'how do I avoid burning out at work', intent: 'preventive', risk: 'low' },
  { text: 'best ways to keep my back healthy', intent: 'preventive', risk: 'low' },
  { text: 'how can I stop getting so run down', intent: 'preventive', risk: 'low' },
  { text: 'ways to protect my sleep during stressful times', intent: 'preventive', risk: 'low' },

  /* recovery, topped up */
  { text: 'how do I ease back into training after illness', intent: 'recovery', risk: 'low' },
  { text: 'what should the first week after concussion look like', intent: 'recovery', risk: 'moderate' },
  { text: 'when can I do contact sport again', intent: 'recovery', risk: 'moderate' },
  { text: 'how long before I feel normal after a virus', intent: 'recovery', risk: 'low' },
  { text: 'getting back to studying after a head injury', intent: 'recovery', risk: 'moderate' },
  { text: 'is it too soon to go back to work', intent: 'recovery', risk: 'low' },

  /* diagnosis-explanation, topped up */
  { text: 'what is persisting post concussion symptoms', intent: 'diagnosis-explanation', risk: 'low' },
  { text: 'explain what generalised anxiety disorder means', intent: 'diagnosis-explanation', risk: 'low' },
  { text: 'what does the gp mean by viral infection', intent: 'diagnosis-explanation', risk: 'low' },
  { text: 'what is meant by graduated return to learn', intent: 'diagnosis-explanation', risk: 'low' },
  { text: 'my diagnosis says tension headache, explain it', intent: 'diagnosis-explanation', risk: 'low' },
  { text: 'what is the science behind why sleep helps healing', intent: 'diagnosis-explanation', risk: 'low' },

  /* symptom: the general "unwell" phrasings that were routing to clarify */
  { text: 'I have been getting sick a lot lately and my head feels heavy', intent: 'symptom', risk: 'moderate' },
  { text: 'feeling unwell for a while now and I do not know why', intent: 'symptom', risk: 'moderate' },
  { text: 'why do I keep getting ill so often', intent: 'symptom', risk: 'moderate' },
  { text: 'my head feels heavy and foggy most days', intent: 'symptom', risk: 'moderate' },
  { text: 'I feel run down all the time, what is going on', intent: 'symptom', risk: 'moderate' },
  { text: 'why am I feeling sick every morning', intent: 'symptom', risk: 'moderate' },
  { text: 'been under the weather for weeks', intent: 'symptom', risk: 'moderate' },
  { text: 'my body feels heavy and slow lately', intent: 'symptom', risk: 'low' },
  { text: 'I am not feeling myself and it is worrying me', intent: 'symptom', risk: 'moderate' },
  { text: 'keep catching everything going around', intent: 'symptom', risk: 'moderate' },
  { text: 'why is my head feeling so heavy', intent: 'symptom', risk: 'low' },
  { text: 'generally feeling rubbish and cannot explain it', intent: 'symptom', risk: 'moderate' },
]

/** Every class the intent model is trained to predict. */
export const INTENT_CLASSES: readonly HealthIntent[] = [
  'symptom',
  'general-health',
  'recovery',
  'mental-health',
  'preventive',
  'diagnosis-explanation',
  'medication',
  'out-of-scope',
  'unclear',
]

/** Every class the risk model is trained to predict. */
export const RISK_CLASSES: readonly RiskLevel[] = ['low', 'moderate', 'high', 'unknown']
