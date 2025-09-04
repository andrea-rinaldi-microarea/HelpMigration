-- ERP-like reference guide (english)
SELECT [Page]
      ,[Title]
      ,[Content]
      ,[Comment]
  FROM [MicroareaWiki].[dbo].[PageContent]
  WHERE (Page LIKE 'RefGuide-M4%' or Page LIKE 'RefGuide-Mago4%') and Page not LIKE '%(__-__)'
  ORDER BY Page

---- ERP-like reference guide (italian)
--SELECT [Page]
--      ,[Title]
--      ,[Content]
--      ,[Comment]
--  FROM [MicroareaWiki].[dbo].[PageContent]
--  WHERE (Page LIKE 'RefGuide-M4%' or Page LIKE 'RefGuide-Mago4%') and Page LIKE '%(it-IT)'
--  ORDER BY Page
