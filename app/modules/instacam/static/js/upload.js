const PHOTOS_BUCKET = "photos";

async function uploadPhotoBlob(blob, promptId) {
  const { data: sessionData } = await supabaseClient.auth.getSession();
  const userId = sessionData.session.user.id;
  const path = `${userId}/${promptId}-${Date.now()}.jpg`;

  const { error: uploadError } = await supabaseClient.storage
    .from(PHOTOS_BUCKET)
    .upload(path, blob, { contentType: "image/jpeg" });

  if (uploadError) {
    throw new Error("No se pudo subir la foto: " + uploadError.message);
  }

  const { data: publicUrlData } = supabaseClient.storage
    .from(PHOTOS_BUCKET)
    .getPublicUrl(path);

  return publicUrlData.publicUrl;
}
