// Generated from the iOS app's ExerciseCatalogue.swift. Permanent keys are independent of presentation.
import type { CatalogueMeasurement } from '../data/types'

export interface CatalogueMovement {
  id: string
  name: string
  equipment: string
  muscle: string
  guidance: string
  measurement: CatalogueMeasurement
}

export const catalogue: CatalogueMovement[] = [
  {"id": "bench", "name": "Bench Press", "equipment": "Barbell", "muscle": "Chest", "guidance": "Lie on a flat bench with feet planted. Set safeties or use a spotter; lower the bar under control, then press.", "measurement": "Load & reps"},
  {"id": "incline-db", "name": "Incline Dumbbell Press", "equipment": "Dumbbell", "muscle": "Chest", "guidance": "Set a modest bench incline. Start with weights beside the upper chest and press upward with wrists stacked.", "measurement": "Load & reps"},
  {"id": "db-press", "name": "Dumbbell Bench Press", "equipment": "Dumbbell", "muscle": "Chest", "guidance": "Lie on a stable bench, feet grounded. Lower the weights beside your chest and press evenly.", "measurement": "Load & reps"},
  {"id": "pushup", "name": "Push-Up", "equipment": "Bodyweight", "muscle": "Chest", "guidance": "Place hands beneath shoulders on the floor or a raised support. Keep trunk aligned as you lower and push away.", "measurement": "Bodyweight reps"},
  {"id": "chest-machine", "name": "Chest Press", "equipment": "Machine", "muscle": "Chest", "guidance": "Adjust the seat so handles meet mid-chest. Keep your back supported as you press and return slowly.", "measurement": "Load & reps"},
  {"id": "fly", "name": "Cable Fly", "equipment": "Cable", "muscle": "Chest", "guidance": "Set handles near chest height and take a balanced stance. Bring softly bent arms together without swinging.", "measurement": "Load & reps"},
  {"id": "ohp", "name": "Overhead Press", "equipment": "Barbell", "muscle": "Shoulders", "guidance": "Start the bar at upper chest height with a firm stance. Brace the trunk and press overhead without leaning back.", "measurement": "Load & reps"},
  {"id": "db-shoulder", "name": "Dumbbell Shoulder Press", "equipment": "Dumbbell", "muscle": "Shoulders", "guidance": "Sit on a supported bench. Begin weights near shoulder height and press upward through a comfortable range.", "measurement": "Load & reps"},
  {"id": "lateral", "name": "Lateral Raise", "equipment": "Dumbbell", "muscle": "Shoulders", "guidance": "Stand tall with light weights at your sides. Raise softly bent arms outward without shrugging or swinging.", "measurement": "Load & reps"},
  {"id": "facepull", "name": "Face Pull", "equipment": "Cable", "muscle": "Shoulders", "guidance": "Set a rope near face height. Step back, then pull toward your face with elbows opening outward.", "measurement": "Load & reps"},
  {"id": "reverse-fly", "name": "Reverse Fly", "equipment": "Dumbbell", "muscle": "Shoulders", "guidance": "Hinge at the hips with a stable trunk. Open your arms to the sides using a light controlled load.", "measurement": "Load & reps"},
  {"id": "deadlift", "name": "Deadlift", "equipment": "Barbell", "muscle": "Posterior chain", "guidance": "Place the bar over midfoot. Hinge and bend knees to grip, brace, then stand with the bar close to your legs.", "measurement": "Load & reps"},
  {"id": "rdl", "name": "Romanian Deadlift", "equipment": "Barbell", "muscle": "Posterior chain", "guidance": "Start standing with the bar close to your thighs. Move hips back with soft knees, then return to standing.", "measurement": "Load & reps"},
  {"id": "row", "name": "Barbell Row", "equipment": "Barbell", "muscle": "Back", "guidance": "Hinge into a stable stance. Pull the bar toward your lower ribs while keeping your trunk steady.", "measurement": "Load & reps"},
  {"id": "db-row", "name": "Dumbbell Row", "equipment": "Dumbbell", "muscle": "Back", "guidance": "Support one hand on a bench. Pull the weight toward your hip without rotating your trunk.", "measurement": "Load & reps"},
  {"id": "pulldown", "name": "Lat Pulldown", "equipment": "Cable", "muscle": "Back", "guidance": "Secure the thigh pad and sit tall. Pull the handle toward your upper chest without leaning far backward.", "measurement": "Load & reps"},
  {"id": "cable-row", "name": "Seated Cable Row", "equipment": "Cable", "muscle": "Back", "guidance": "Sit with feet supported and knees soft. Draw the handle toward your ribs, then extend arms under control.", "measurement": "Load & reps"},
  {"id": "pullup", "name": "Pull-Up", "equipment": "Bodyweight", "muscle": "Back", "guidance": "Use a secure overhead bar. Pull upward without kicking and lower with control; use assistance if needed.", "measurement": "Bodyweight reps"},
  {"id": "squat", "name": "Squats", "equipment": "Barbell", "muscle": "Legs", "guidance": "Set rack safeties and a comfortable stance. Brace, bend hips and knees, then stand while keeping feet grounded.", "measurement": "Load & reps"},
  {"id": "goblet", "name": "Goblet Squat", "equipment": "Dumbbell", "muscle": "Legs", "guidance": "Hold a weight near your chest. Sit down between your hips through a comfortable range and stand tall.", "measurement": "Load & reps"},
  {"id": "front-squat", "name": "Front Squat", "equipment": "Barbell", "muscle": "Legs", "guidance": "Set safeties and support the bar across the front shoulders. Keep elbows lifted as you squat and stand.", "measurement": "Load & reps"},
  {"id": "legpress", "name": "Leg Press", "equipment": "Machine", "muscle": "Legs", "guidance": "Adjust the seat and safety stops. Keep hips supported while bending knees and pressing the platform away.", "measurement": "Load & reps"},
  {"id": "split", "name": "Split Squat", "equipment": "Dumbbell", "muscle": "Legs", "guidance": "Take a staggered stance with room for balance. Lower the rear knee toward the floor, then rise.", "measurement": "Load & reps"},
  {"id": "lunge", "name": "Reverse Lunge", "equipment": "Dumbbell", "muscle": "Legs", "guidance": "Stand with clear space behind you. Step back, bend both knees, and push through the front foot to return.", "measurement": "Load & reps"},
  {"id": "stepup", "name": "Step-Up", "equipment": "Dumbbell", "muscle": "Legs", "guidance": "Choose a stable low step. Place the whole lead foot on it and step up without launching off the trailing foot.", "measurement": "Load & reps"},
  {"id": "extension", "name": "Leg Extension", "equipment": "Machine", "muscle": "Legs", "guidance": "Align knees with the machine pivot and place the pad above your ankles. Extend and lower smoothly.", "measurement": "Load & reps"},
  {"id": "curl-leg", "name": "Seated Leg Curl", "equipment": "Machine", "muscle": "Posterior chain", "guidance": "Adjust the pivot to your knees and secure the thigh pad. Curl the lower legs back, then return slowly.", "measurement": "Load & reps"},
  {"id": "hipthrust", "name": "Hip Thrust", "equipment": "Barbell", "muscle": "Posterior chain", "guidance": "Support your upper back on a stable bench and pad the bar. Raise hips while keeping ribs controlled.", "measurement": "Load & reps"},
  {"id": "calf", "name": "Calf Raise", "equipment": "Machine", "muscle": "Calves", "guidance": "Set the pads and foot support securely. Rise onto the balls of your feet and lower without bouncing.", "measurement": "Load & reps"},
  {"id": "curl", "name": "Dumbbell Curl", "equipment": "Dumbbell", "muscle": "Arms", "guidance": "Stand with elbows near your sides. Curl the weights without swinging and lower them slowly.", "measurement": "Load & reps"},
  {"id": "hammer", "name": "Hammer Curl", "equipment": "Dumbbell", "muscle": "Arms", "guidance": "Keep palms facing inward and elbows close. Bend the elbows to lift, then lower under control.", "measurement": "Load & reps"},
  {"id": "pushdown", "name": "Triceps Pushdown", "equipment": "Cable", "muscle": "Arms", "guidance": "Set a high pulley and keep elbows by your sides. Straighten the arms without rocking your torso.", "measurement": "Load & reps"},
  {"id": "triceps", "name": "Overhead Triceps Extension", "equipment": "Dumbbell", "muscle": "Arms", "guidance": "Use a manageable weight overhead. Bend elbows to lower behind the head, then extend through a comfortable range.", "measurement": "Load & reps"},
  {"id": "crunch", "name": "Cable Crunch", "equipment": "Cable", "muscle": "Core", "guidance": "Kneel below a high rope pulley. Hold it steady near your head and curl the trunk without pulling with the arms.", "measurement": "Load & reps"},
  {"id": "plank", "name": "Plank", "equipment": "Bodyweight", "muscle": "Core", "guidance": "Rest forearms on the floor with elbows beneath shoulders. Extend the legs and hold a steady trunk while breathing normally.", "measurement": "Duration"},
  {"id": "carry", "name": "Farmer Carry", "equipment": "Dumbbell", "muscle": "Other", "guidance": "Choose a clear walking path and manageable weights. Stand tall, carry them beside your hips and walk with controlled steps.", "measurement": "Distance & duration"},
]
