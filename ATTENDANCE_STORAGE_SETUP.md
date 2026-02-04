# Attendance Image Storage Configuration

## Overview

The driver attendance system uses Supabase Storage (S3-compatible) to store attendance images with a well-organized folder structure.

## Storage Structure

Images are organized in a hierarchical date-based structure:

```
driver-attendance/
└── attendance/
    └── {YEAR}/
        └── {MONTH}/
            └── {DAY}/
                ├── {driverId}_{timestamp}_login.jpg
                ├── {driverId}_{timestamp}_logout.jpg
                └── ...
```

### Example Structure

```
driver-attendance/
└── attendance/
    ├── 2026/
    │   ├── 01/
    │   │   ├── 15/
    │   │   │   ├── driver-123_1705334400000_login.jpg
    │   │   │   ├── driver-123_1705363200000_logout.jpg
    │   │   │   ├── driver-456_1705334400000_login.jpg
    │   │   ├── 16/
    │   │   │   ├── driver-123_1705420800000_login.jpg
    │   ├── 02/
    │   │   ├── 04/
    │   │   │   ├── driver-123_1707062400000_login.jpg
    │   │   │   └── driver-123_1707091200000_logout.jpg
```

## File Naming Convention

Each file follows this pattern:
```
{driverId}_{timestamp}_{actionType}.{extension}
```

**Components:**
- `driverId`: Unique driver identifier (e.g., `driver-123`, UUID)
- `timestamp`: Unix timestamp in milliseconds (e.g., `1707062400000`)
- `actionType`: Either `login` or `logout`
- `extension`: Image format (typically `jpg` or `jpeg`)

**Example filenames:**
- `driver-abc123_1707062400000_login.jpg`
- `550e8400-e29b-41d4-a716-446655440000_1707091200000_logout.jpg`

## Supabase Storage Setup

### Step 1: Create Storage Bucket

1. Open your **Supabase Dashboard**
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Configure bucket settings:
   - **Name**: `driver-attendance`
   - **Public bucket**: ✅ **Enabled** (required for public URLs)
   - **File size limit**: 5 MB (adjustable based on needs)
   - **Allowed MIME types**: 
     - `image/jpeg`
     - `image/jpg`
     - `image/png`

### Step 2: Configure Bucket Policies

Set up Row Level Security (RLS) policies for the bucket:

```sql
-- Policy: Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload attendance images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'driver-attendance' AND
  (storage.foldername(name))[1] = 'attendance'
);

-- Policy: Allow public read access to images
CREATE POLICY "Public read access to attendance images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'driver-attendance');

-- Policy: Drivers can only upload to their own folder
CREATE POLICY "Drivers can upload own attendance images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'driver-attendance' AND
  auth.uid()::text = (storage.foldername(name))[4]
);
```

### Step 3: Verify Bucket Configuration

Check that the bucket is properly configured:

```sql
-- Check bucket exists and is public
SELECT 
  id, 
  name, 
  public, 
  file_size_limit, 
  allowed_mime_types
FROM storage.buckets 
WHERE name = 'driver-attendance';
```

Expected result:
- `name`: `driver-attendance`
- `public`: `true`
- `file_size_limit`: `5242880` (5MB)
- `allowed_mime_types`: `{image/jpeg,image/jpg,image/png}`

## Storage Benefits

### 1. **Organized Structure**
- Easy to browse images by date
- Simplified cleanup of old records
- Efficient backup and archival strategies

### 2. **Performance**
- Faster queries when searching by date
- Optimized CDN caching with date-based paths
- Reduced storage costs with organized retention policies

### 3. **Scalability**
- Handles millions of images without performance degradation
- Easy to implement date-based partitioning
- Supports automated cleanup scripts

### 4. **Compliance**
- Audit trail with timestamp in filename
- Easy to implement data retention policies
- Supports GDPR/privacy requirements with user-specific folders

## Image Upload Flow

```
┌─────────────────┐
│   Driver App    │
│  (Web/Mobile)   │
└────────┬────────┘
         │ 1. Capture Image
         │ 2. Call attendanceService.createAttendance()
         ▼
┌─────────────────┐
│ attendanceService│
│   (TypeScript)  │
└────────┬────────┘
         │ 3. Generate structured path
         │    attendance/2026/02/04/driver-123_1707062400000_login.jpg
         │
         │ 4. Upload to Supabase Storage
         ▼
┌─────────────────┐
│ Supabase Storage│
│   (S3-compatible)│
└────────┬────────┘
         │ 5. Store file
         │ 6. Return public URL
         ▼
┌─────────────────┐
│   Database      │
│ (driver_attendance)│
└─────────────────┘
         │ 7. Save record with image_url
```

## Code Implementation

The upload is handled in `attendanceService.ts`:

```typescript
// Generate structured path
const now = new Date();
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, '0');
const day = String(now.getDate()).padStart(2, '0');
const timestamp = now.getTime();
const fileName = `${driverId}_${timestamp}_${actionType}.jpg`;
const filePath = `attendance/${year}/${month}/${day}/${fileName}`;

// Upload to Supabase Storage
const { error: uploadError } = await supabase.storage
  .from('driver-attendance')
  .upload(filePath, imageFile, {
    cacheControl: '31536000', // 1 year
    upsert: false,
    contentType: imageFile.type,
  });

// Get public URL
const { data: urlData } = supabase.storage
  .from('driver-attendance')
  .getPublicUrl(filePath);

imageUrl = urlData.publicUrl;
```

## Testing the Setup

### Test Upload

```typescript
// Test in browser console or component
const testFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
await attendanceService.createAttendance(
  'test-driver-123',
  'login',
  testFile,
  14.5995,
  120.9842
);
```

### Verify Upload

1. Check Supabase Storage dashboard
2. Navigate to `driver-attendance` bucket
3. Browse to today's folder structure
4. Verify image appears with correct naming

### Check Database Record

```sql
SELECT 
  id,
  driver_id,
  action_type,
  attendance_date,
  image_url,
  latitude,
  longitude,
  timestamp
FROM driver_attendance
WHERE driver_id = 'test-driver-123'
ORDER BY timestamp DESC
LIMIT 1;
```

## Maintenance & Cleanup

### Archive Old Images (Optional)

Archive images older than 1 year:

```typescript
// Example cleanup script
async function archiveOldImages(daysOld = 365) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  const year = cutoffDate.getFullYear();
  const month = String(cutoffDate.getMonth() + 1).padStart(2, '0');
  
  // List and move old folders
  const { data: files } = await supabase.storage
    .from('driver-attendance')
    .list(`attendance/${year}/${month}`);
  
  // Implement archival logic here
}
```

### Storage Monitoring

Monitor bucket usage:

```sql
-- Check total storage used
SELECT 
  bucket_id,
  COUNT(*) as file_count,
  SUM(metadata->>'size')::bigint as total_bytes,
  pg_size_pretty(SUM(metadata->>'size')::bigint) as total_size
FROM storage.objects
WHERE bucket_id = 'driver-attendance'
GROUP BY bucket_id;

-- Files by date
SELECT 
  (metadata->>'lastModified')::date as upload_date,
  COUNT(*) as file_count,
  pg_size_pretty(SUM(metadata->>'size')::bigint) as total_size
FROM storage.objects
WHERE bucket_id = 'driver-attendance'
GROUP BY upload_date
ORDER BY upload_date DESC;
```

## Troubleshooting

### Error: "Failed to upload image"

**Causes:**
1. Bucket doesn't exist
2. Bucket is not public
3. File size exceeds limit
4. MIME type not allowed

**Solution:**
```typescript
// Check error details in console
console.error('Upload error:', uploadError);

// Verify bucket configuration
const { data: buckets } = await supabase.storage.listBuckets();
console.log('Available buckets:', buckets);
```

### Error: "Image URL is undefined"

**Cause:** Public access not enabled

**Solution:**
1. Go to Supabase Storage settings
2. Enable "Public bucket" for `driver-attendance`
3. Test public URL generation

### Error: "Permission denied"

**Cause:** RLS policies blocking upload

**Solution:**
```sql
-- Temporarily disable to test
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Then re-enable and fix policies
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
```

## Security Best Practices

1. **Validate file types** - Only accept images
2. **Limit file size** - Max 5MB recommended
3. **Sanitize filenames** - Use generated names, not user input
4. **Enable RLS** - Control access at database level
5. **Use HTTPS only** - Ensure secure transmission
6. **Implement rate limiting** - Prevent abuse
7. **Monitor uploads** - Track unusual activity

## Cost Optimization

**Storage costs** (Approximate):
- Storage: $0.021 per GB/month
- Bandwidth: $0.09 per GB (after free tier)

**Example calculation:**
- 100 drivers × 2 images/day × 30KB/image = 6MB/day
- Monthly storage: ~180MB = ~$0.004/month
- With 1 year retention: ~2.2GB = ~$0.05/month

**Tips:**
1. Use JPEG compression (0.8 quality)
2. Implement automatic cleanup of old images
3. Use CDN caching to reduce bandwidth costs
4. Archive old images to cheaper cold storage
