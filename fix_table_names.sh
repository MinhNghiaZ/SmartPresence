#!/bin/bash

# Script to fix table names from PascalCase to lowercase
echo "🔧 Fixing table names to lowercase..."

# Define the files to fix
FILES=(
    "backend/src/services/AttendenceService/AttendenceService.ts"
    "backend/src/controllers/AttendenceController/AttendenceController.ts"
    "backend/src/services/ClassSessionService/ClassSessionService.ts"
    "backend/src/services/SubjectService/SubjectsManagement.ts"
    "backend/src/services/StorageService/StorageService.ts"
    "backend/src/services/FaceService/FaceRecognitionService.ts"
    "backend/src/services/GpsService/gpsService.ts"
    "backend/src/services/AuthService/authService.ts"
)

# Define table name replacements
declare -A REPLACEMENTS=(
    ["FROM Attendance"]="FROM attendance"
    ["JOIN Attendance"]="JOIN attendance"
    ["FROM Subject"]="FROM subject" 
    ["JOIN Subject"]="JOIN subject"
    ["FROM Enrollment"]="FROM enrollment"
    ["JOIN Enrollment"]="JOIN enrollment"
    ["FROM ClassSession"]="FROM classsession"
    ["JOIN ClassSession"]="JOIN classsession"
    ["FROM TimeSlot"]="FROM timeslot"
    ["JOIN TimeSlot"]="JOIN timeslot"
    ["FROM Room"]="FROM room"
    ["JOIN Room"]="JOIN room"
    ["FROM StudentAccount"]="FROM studentaccount"
    ["JOIN StudentAccount"]="JOIN studentaccount"
)

# Apply replacements to each file
for FILE in "${FILES[@]}"; do
    if [ -f "$FILE" ]; then
        echo "Fixing: $FILE"
        for OLD in "${!REPLACEMENTS[@]}"; do
            NEW="${REPLACEMENTS[$OLD]}"
            sed -i "s/$OLD/$NEW/g" "$FILE"
        done
    else
        echo "File not found: $FILE"
    fi
done

echo "✅ Done!"