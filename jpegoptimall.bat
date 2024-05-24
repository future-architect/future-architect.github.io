cd source/images
for /F %%I in ('dir /b/s *202112*.jpeg *202112*.jpg')do @jpegoptim --strip-all --overwrite -m80  %%I %%I
cd ../../
