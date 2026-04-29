-- Align DemoRequest data with updated demo form fields
ALTER TABLE "DemoRequest"
ADD COLUMN "jobTitle" TEXT,
ADD COLUMN "isUsingEdumerge" BOOLEAN,
ADD COLUMN "hearAboutUs" TEXT;
