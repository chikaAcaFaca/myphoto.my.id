package id.my.myphoto.subjectsegmentation

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.ExifInterface
import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.segmentation.subject.SubjectSegmentation
import com.google.mlkit.vision.segmentation.subject.SubjectSegmenterOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileOutputStream

class SubjectSegmentationModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("SubjectSegmentation")

    // removeBackground(uri) -> file:// URI of a PNG containing only the
    // detected subject on a transparent background. Runs fully on-device.
    AsyncFunction("removeBackground") { uri: String, promise: Promise ->
      val context = appContext.reactContext
      if (context == null) {
        promise.reject("NO_CONTEXT", "React context is unavailable", null)
        return@AsyncFunction
      }

      val bitmap = try {
        loadBitmap(context, Uri.parse(uri))
      } catch (e: Exception) {
        promise.reject("DECODE_FAILED", e.message ?: "Could not decode image", e)
        return@AsyncFunction
      }

      val options = SubjectSegmenterOptions.Builder()
        .enableForegroundBitmap()
        .build()
      val segmenter = SubjectSegmentation.getClient(options)
      val image = InputImage.fromBitmap(bitmap, 0)

      segmenter.process(image)
        .addOnSuccessListener { result ->
          try {
            val foreground = result.foregroundBitmap
            if (foreground == null) {
              promise.reject("NO_SUBJECT", "No subject detected in the image", null)
            } else {
              val outFile = File(context.cacheDir, "removebg_${System.currentTimeMillis()}.png")
              FileOutputStream(outFile).use { out ->
                foreground.compress(Bitmap.CompressFormat.PNG, 100, out)
              }
              promise.resolve("file://${outFile.absolutePath}")
            }
          } catch (e: Exception) {
            promise.reject("SAVE_FAILED", e.message ?: "Could not save result", e)
          } finally {
            segmenter.close()
          }
        }
        .addOnFailureListener { e ->
          segmenter.close()
          promise.reject("SEGMENT_FAILED", e.message ?: "Segmentation failed", e)
        }
    }
  }

  // Decode with a sample size so large photos don't OOM, then apply EXIF
  // rotation so the segmented subject keeps the original orientation.
  private fun loadBitmap(context: Context, uri: Uri): Bitmap {
    val maxDim = 2048

    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    context.contentResolver.openInputStream(uri).use { input ->
      BitmapFactory.decodeStream(input, null, bounds)
    }

    var sample = 1
    val longest = maxOf(bounds.outWidth, bounds.outHeight)
    while (longest > 0 && longest / sample > maxDim) sample *= 2

    val decodeOpts = BitmapFactory.Options().apply { inSampleSize = sample }
    val decoded = context.contentResolver.openInputStream(uri).use { input ->
      BitmapFactory.decodeStream(input, null, decodeOpts)
    } ?: throw IllegalArgumentException("Could not decode image at $uri")

    return applyExifRotation(context, uri, decoded)
  }

  private fun applyExifRotation(context: Context, uri: Uri, bitmap: Bitmap): Bitmap {
    return try {
      val orientation = context.contentResolver.openInputStream(uri).use { input ->
        if (input == null) return bitmap
        ExifInterface(input).getAttributeInt(
          ExifInterface.TAG_ORIENTATION,
          ExifInterface.ORIENTATION_NORMAL
        )
      }
      val degrees = when (orientation) {
        ExifInterface.ORIENTATION_ROTATE_90 -> 90f
        ExifInterface.ORIENTATION_ROTATE_180 -> 180f
        ExifInterface.ORIENTATION_ROTATE_270 -> 270f
        else -> 0f
      }
      if (degrees == 0f) {
        bitmap
      } else {
        val matrix = Matrix().apply { postRotate(degrees) }
        Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
      }
    } catch (e: Exception) {
      bitmap
    }
  }
}
