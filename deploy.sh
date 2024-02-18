# Environment variables needed:
# AWS_ACCESS_KEY_ID
# AWS_SECRET_ACCESS_KEY
# AWS_DEFAULT_REGION
# CDN_DISTRIBUTION_ID
# S3_BUCKET_NAME

echo Syncing "dist" directory with S3 bucket...
aws s3 sync --delete dist "s3://${S3_BUCKET_NAME}"

echo Invalidating CloudFront distribution...
aws cloudfront create-invalidation --distribution-id $CDN_DISTRIBUTION_ID --paths "/*"
