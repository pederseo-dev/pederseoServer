async function uploadPhotoBlob(blob, itemId) {
  const { data: sessionData } = await supabaseClient.auth.getSession();
  const userId = sessionData.session.user.id;
  const path = `${userId}/${itemId}-${Date.now()}.jpg`;

  const { error: uploadError } = await supabaseClient.storage
    .from("wedding-photos")
    .upload(path, blob, { contentType: "image/jpeg" });

  if (uploadError) {
    throw new Error("No se pudo subir la foto: " + uploadError.message);
  }

  const { data: publicUrlData } = supabaseClient.storage
    .from("wedding-photos")
    .getPublicUrl(path);

  return publicUrlData.publicUrl;
}
