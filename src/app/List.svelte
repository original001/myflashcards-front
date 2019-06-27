<script>
  let cards = [
    {
      cardId: 1,
      word: "amica",
      repeatTime: "111",
      direction: 1,
      images: ["link1", "link2"],
      audio: "link"
    },
    {
      cardId: 2,
      word: "amico",
      repeatTime: "111",
      direction: 1,
      images: ["link1", "link2"],
      audio: "link"
    }
  ];
</script>

<style>
  p {
    margin-bottom: 20px;
  }
</style>

<div>
  {#each cards as card}
    <p>{card.word} {card.images.length}</p>
  {/each}
</div>
