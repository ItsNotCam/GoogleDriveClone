// GET COMMENTS
{
  // GET
  const GET_SQL: string = `SELECT USER_ID, COMMENT FROM COMMENT WHERE COMMENT_ID='....'`

  // PATCH
  const PATCH_SQL: string = `UPDATE COMMENT SET COMMENT='....' WHERE COMMENT_ID='....'`

  // DELETE
  const DELETE_SQL: string = `DELETE FROM COMMENT WHERE COMMENT_ID='....'`
}