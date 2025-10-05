# Test TimeSlot Validation Logic

## 🎯 Test Scenarios:

### ✅ **Valid TimeSlot** (Sẽ tạo ClassSession)
```sql
-- TimeSlot hợp lệ
UPDATE TimeSlot SET 
    start_date = '2025-10-01',
    end_date = '2025-12-31', 
    active = 1
WHERE timeSlotId = 'TS_CSE107_MON_08';
```
**Expected:** Tạo session cho ngày 2025-10-05 (Monday)

### ❌ **Inactive TimeSlot** (Không tạo ClassSession)
```sql
-- TimeSlot bị disabled
UPDATE TimeSlot SET 
    start_date = '2025-10-01',
    end_date = '2025-12-31', 
    active = 0
WHERE timeSlotId = 'TS_CSE107_TUE_10';
```
**Expected:** Bỏ qua, không tạo session

### ❌ **Out of Date Range** (Không tạo ClassSession)
```sql
-- TimeSlot đã hết hạn
UPDATE TimeSlot SET 
    start_date = '2025-08-01',
    end_date = '2025-09-30', 
    active = 1
WHERE timeSlotId = 'TS_CSE107_WED_14';
```
**Expected:** Bỏ qua, không tạo session vì current_date (2025-10-05) > end_date

### ❌ **Future Start Date** (Không tạo ClassSession)
```sql
-- TimeSlot chưa bắt đầu
UPDATE TimeSlot SET 
    start_date = '2025-11-01',
    end_date = '2025-12-31', 
    active = 1
WHERE timeSlotId = 'TS_CSE107_THU_16';
```
**Expected:** Bỏ qua, không tạo session vì current_date (2025-10-05) < start_date

## 🔍 **Validation Query:**
```sql
SELECT ts.timeSlotId, ts.subjectId, ts.start_time, ts.end_time, ts.roomId,
       ts.start_date, ts.end_date, ts.active
FROM TimeSlot ts
WHERE ts.day_of_week = 'Mon'
  AND ts.active = 1
  AND '2025-10-05' BETWEEN ts.start_date AND ts.end_date;
```

## 📊 **Expected Logs:**
```
🔄 Generating class sessions for Mon (2025-10-05)
📊 Found 1 active timeslots for Mon (2025-10-05)
✅ Created session: SESSION_2025-10-05_TS_CSE107_MON_08 (2025-10-01 to 2025-12-31)
✅ Generated 1 new sessions for 2025-10-05
```